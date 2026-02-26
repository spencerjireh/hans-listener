"""
Qwen3-TTS sidecar server (via mlx-audio).

Thin FastAPI wrapper that imports helpers from mlx_audio.server
rather than mounting their app directly. This avoids route-override
conflicts and gives us full control over endpoints.
"""

import argparse
import io

import librosa
import soundfile as sf
import uvicorn
from fastapi import FastAPI
from fastapi.responses import Response
from mlx_audio.server import model_provider, generate_audio, SpeechRequest

app = FastAPI()

# Set after CLI parse, before uvicorn starts
_model_id: str = "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16"
_model_loaded: bool = False


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    if _model_loaded:
        return {"status": "ready"}
    return Response(
        status_code=503,
        content='{"status":"loading"}',
        media_type="application/json",
    )


@app.post("/v1/audio/speech")
async def speech(req: SpeechRequest):
    if not _model_loaded:
        return Response(
            status_code=503,
            content='{"error":"model not ready"}',
            media_type="application/json",
        )

    model = model_provider.load_model(_model_id)

    # Decide whether to use native speed or post-process with librosa
    native_speed = req.speed if 0.8 <= req.speed <= 1.3 else 1.0
    needs_stretch = req.speed < 0.8 or req.speed > 1.3

    # Override speed in the request for native handling
    payload = req.model_copy(update={"speed": native_speed})

    # generate_audio is an async generator yielding bytes chunks
    chunks: list[bytes] = []
    async for chunk in generate_audio(model, payload):
        chunks.append(chunk)

    audio_bytes = b"".join(chunks)

    if needs_stretch:
        # Decode WAV, time-stretch, re-encode
        audio_np, sr = sf.read(io.BytesIO(audio_bytes))
        stretched = librosa.effects.time_stretch(audio_np, rate=req.speed)
        buf = io.BytesIO()
        sf.write(buf, stretched, sr, format="WAV", subtype="PCM_16")
        buf.seek(0)
        audio_bytes = buf.read()

    return Response(content=audio_bytes, media_type="audio/wav")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Qwen3-TTS sidecar server")
    parser.add_argument("--port", type=int, default=8321)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument(
        "--model-dir",
        type=str,
        default=None,
        help="Path to local model weights directory.",
    )
    args = parser.parse_args()

    # Resolve model identifier
    if args.model_dir:
        _model_id = args.model_dir
    print(f"[tts-engine] Loading model: {_model_id}")

    # Synchronous model preload before starting uvicorn
    model_provider.load_model(_model_id)
    _model_loaded = True
    print("[tts-engine] Model ready.")

    uvicorn.run(app, host=args.host, port=args.port, log_level="info", workers=1)
