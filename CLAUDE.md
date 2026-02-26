# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Hans Listener -- offline German text-to-speech desktop app for language learners with karaoke-style word highlighting. Built on Electron + React with a Python TTS sidecar (Qwen3-TTS via mlx-audio).

## Commands

```bash
npm run dev          # Start Electron dev server with HMR
npm run build        # Build with electron-vite
npm run dist         # Build + package with electron-builder (macOS DMG)
```

No test runner or linter is configured.

The Python sidecar (`sidecar/server.py`) runs automatically when the Electron app starts. To run it standalone:

```bash
cd sidecar && source .venv/bin/activate && python server.py
```

## Architecture

Three-process design:

1. **Main process** (`src/main/`) -- Electron main; spawns the sidecar, manages IPC, handles history persistence and text processing.
2. **Renderer** (`src/renderer/`) -- React 18 UI; hooks-based state management (`useAudioPlayer`, `useHistory`, `useHighlighting`, `useSentences`), Web Audio API for playback, Tailwind CSS 4.
3. **Sidecar** (`sidecar/server.py`) -- FastAPI server running Qwen3-TTS via mlx-audio on a localhost port. Auto-spawned by `SidecarManager`, health-polled, and gracefully shut down on app exit.

### IPC flow

Renderer calls `window.hansListenerAPI.*` (exposed via `src/preload/index.ts` contextBridge) which maps to `ipcMain.handle()` handlers registered in `src/main/ipc-handlers.ts`. Channel constants live in `src/shared/ipc-channels.ts`.

### Sidecar integration

`SidecarManager` (`src/main/tts-engine/sidecar-manager.ts`) spawns the Python process, assigns a free port, and polls `/health` until the model is loaded (up to 2 min for first-run model download). `tts-bridge.ts` (`src/main/tts-engine/tts-bridge.ts`) wraps HTTP calls to the sidecar's OpenAI-compatible endpoint (`POST /v1/audio/speech`).

Speed handling: the sidecar passes speeds 0.8--1.3 natively to Qwen3-TTS; values outside that range use librosa time-stretch as post-processing.

### Voice system

`voice-manager.ts` discovers voices: a built-in "Chelsie" voice plus zero-shot cloned voices from `.wav` reference clips in `resources/voices/`. Each voice can have a companion `.txt` file with the reference transcript for better cloning.

### Word timing / karaoke

Word timings are *approximated* via syllable-weighted distribution across the total audio duration (not forced alignment). German syllable counting uses vowel-group matching including umlauts. Sentence splitting handles German abbreviations (z.B., d.h., etc.) and ordinal numbers.

### Key directories

- `src/shared/` -- shared TypeScript types (`types.ts`) and IPC channel constants
- `src/main/text/` -- sentence splitting and syllable-weighted word tokenization for karaoke timing
- `src/main/history/` -- JSON index + WAV file cache in `userData/history/` (max 100 entries, LRU eviction, atomic index writes)
- `resources/` -- gitignored; holds model weights (`model/`), voice WAVs (`voices/`), and platform-specific sidecar binaries (`tts-engine/{arch}/`)

## Conventions

- Use `uv` instead of `pip` or `venv` for Python dependency and environment management.

## Tech stack

Electron 33, electron-vite, React 18, TypeScript 5.6, Tailwind CSS 4, lamejs (MP3 encoding), FastAPI + Qwen3-TTS + mlx-audio (sidecar)
