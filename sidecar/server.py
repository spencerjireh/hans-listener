"""
Chatterbox Multilingual TTS sidecar server.

Wraps the Chatterbox model in a FastAPI HTTP server so that
Electron can request speech synthesis over localhost.
"""

import argparse
import io
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch
import torch.nn.functional as F
import uvicorn
from chatterbox.tts import ChatterboxTTS, punc_norm
from chatterbox.models.s3tokenizer import drop_invalid_tokens
from chatterbox.models.t3.modules.cond_enc import T3Cond
from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------

model: ChatterboxTTS | None = None
model_ready = threading.Event()
cancel_flag = threading.Event()
generation_progress: dict = {"stage": "idle", "percent": 0, "message": ""}
model_dir: str | None = None  # set from CLI before uvicorn starts
use_half: bool = False
default_cfm_steps: int | None = None  # set from CLI; None = library default (10)


# ---------------------------------------------------------------------------
# Fast generation with n_cfm_timesteps support
# ---------------------------------------------------------------------------

def generate_fast(
    m: ChatterboxTTS,
    text: str,
    audio_prompt_path: str | None = None,
    exaggeration: float = 0.5,
    n_cfm_timesteps: int | None = None,
    cfg_weight: float = 0.5,
    temperature: float = 0.8,
    repetition_penalty: float = 1.2,
    min_p: float = 0.05,
    top_p: float = 1.0,
):
    """Like ChatterboxTTS.generate() but forwards n_cfm_timesteps to the vocoder."""
    global generation_progress

    generation_progress = {"stage": "conditioning", "percent": 5, "message": "Preparing voice..."}

    if audio_prompt_path:
        m.prepare_conditionals(audio_prompt_path, exaggeration=exaggeration)
    else:
        assert m.conds is not None

    # Update exaggeration if it changed
    if exaggeration != m.conds.t3.emotion_adv[0, 0, 0]:
        _cond = m.conds.t3
        m.conds.t3 = T3Cond(
            speaker_emb=_cond.speaker_emb,
            cond_prompt_speech_tokens=_cond.cond_prompt_speech_tokens,
            emotion_adv=exaggeration * torch.ones(1, 1, 1),
        ).to(device=m.device)

    generation_progress = {"stage": "tokenizing", "percent": 10, "message": "Tokenizing text..."}

    text = punc_norm(text)
    text_tokens = m.tokenizer.text_to_tokens(text).to(m.device)
    if cfg_weight > 0.0:
        text_tokens = torch.cat([text_tokens, text_tokens], dim=0)
    text_tokens = F.pad(text_tokens, (1, 0), value=m.t3.hp.start_text_token)
    text_tokens = F.pad(text_tokens, (0, 1), value=m.t3.hp.stop_text_token)

    generation_progress = {"stage": "generating", "percent": 15, "message": "Generating speech tokens..."}

    with torch.inference_mode():
        speech_tokens = m.t3.inference(
            t3_cond=m.conds.t3,
            text_tokens=text_tokens,
            max_new_tokens=1000,
            temperature=temperature,
            cfg_weight=cfg_weight,
            repetition_penalty=repetition_penalty,
            min_p=min_p,
            top_p=top_p,
        )
        speech_tokens = speech_tokens[0]
        speech_tokens = drop_invalid_tokens(speech_tokens)
        speech_tokens = speech_tokens[speech_tokens < 6561]
        speech_tokens = speech_tokens.to(m.device)

        generation_progress = {"stage": "vocoding", "percent": 70, "message": "Synthesizing waveform..."}

        wav, _ = m.s3gen.inference(
            speech_tokens=speech_tokens,
            ref_dict=m.conds.gen,
            n_cfm_timesteps=n_cfm_timesteps,
        )
        wav = wav.squeeze(0).detach().cpu().numpy()

        generation_progress = {"stage": "finalizing", "percent": 95, "message": "Finalizing audio..."}

        watermarked_wav = m.watermarker.apply_watermark(wav, sample_rate=m.sr)

    return torch.from_numpy(watermarked_wav).unsqueeze(0)


# ---------------------------------------------------------------------------
# Lifespan -- load model once at startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_app: FastAPI):
    global model

    if torch.backends.mps.is_available():
        device = "mps"
    elif torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"

    if model_dir:
        print(f"[chatterbox] Loading model from {model_dir} on {device} ...")
        model = ChatterboxTTS.from_local(Path(model_dir), device=device)
    else:
        print(f"[chatterbox] Downloading model (first run) on {device} ...")
        model = ChatterboxTTS.from_pretrained(device=device)

    if use_half and device != "cpu":
        model.t3.half()
        model.s3gen.half()
        print(f"[chatterbox] Models cast to float16 on {device}")

    model_ready.set()
    print("[chatterbox] Model ready.")
    yield
    model = None


app = FastAPI(lifespan=lifespan)


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class TTSRequest(BaseModel):
    text: str
    language: str = "en"
    reference_audio_path: str | None = None
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    exaggeration: float = Field(default=0.5, ge=0.0, le=1.0)
    cfm_steps: int | None = Field(default=None, ge=1, le=50)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    if model_ready.is_set():
        return {"status": "ready"}
    return Response(status_code=503, content='{"status":"loading"}',
                    media_type="application/json")


@app.get("/progress")
def progress():
    return generation_progress


@app.post("/tts")
def tts(req: TTSRequest):
    global generation_progress

    if model is None or not model_ready.is_set():
        return Response(status_code=503, content='{"error":"model not ready"}',
                        media_type="application/json")

    cancel_flag.clear()
    generation_progress = {"stage": "starting", "percent": 0, "message": "Starting synthesis..."}

    cfm_steps = req.cfm_steps or default_cfm_steps  # request > CLI > library default
    audio_tensor = generate_fast(
        model,
        req.text,
        audio_prompt_path=req.reference_audio_path,
        exaggeration=req.exaggeration,
        n_cfm_timesteps=cfm_steps,
    )

    if cancel_flag.is_set():
        return Response(status_code=499, content='{"error":"cancelled"}',
                        media_type="application/json")

    # model.generate() returns torch.Tensor of shape [1, N] -- squeeze to 1D numpy
    audio_np = audio_tensor.squeeze().cpu().numpy()
    sample_rate = model.sr

    # Time-stretch for speed control (Chatterbox has no native speed param)
    if abs(req.speed - 1.0) > 0.01:
        audio_np = librosa.effects.time_stretch(audio_np, rate=req.speed)

    if cancel_flag.is_set():
        return Response(status_code=499, content='{"error":"cancelled"}',
                        media_type="application/json")

    # Encode as 16-bit PCM WAV
    buf = io.BytesIO()
    sf.write(buf, audio_np, sample_rate, format="WAV", subtype="PCM_16")
    buf.seek(0)
    wav_bytes = buf.read()

    generation_progress = {"stage": "idle", "percent": 100, "message": ""}

    return Response(content=wav_bytes, media_type="audio/wav")


@app.post("/cancel")
def cancel():
    cancel_flag.set()
    return {"status": "cancel_requested"}


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chatterbox TTS server")
    parser.add_argument("--port", type=int, default=8321)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--model-dir", type=str, default=None,
                        help="Path to local model weights directory. "
                             "If omitted, downloads from HuggingFace on first run.")
    parser.add_argument("--half", action="store_true",
                        help="Cast models to float16 for faster inference (MPS/CUDA only)")
    parser.add_argument("--cfm-steps", type=int, default=None,
                        help="Default CFM timesteps for vocoder (original=10, faster=4, fastest=2)")
    args = parser.parse_args()

    model_dir = args.model_dir
    use_half = args.half
    default_cfm_steps = args.cfm_steps
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
