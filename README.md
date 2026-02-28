# Hans Listener

Offline German text-to-speech desktop app for language learners. Paste or type German text, hear it spoken aloud with karaoke-style word highlighting, and navigate sentence by sentence at your own pace.

Built with Electron, React, and Qwen3-TTS (via mlx-audio) -- everything runs locally on Apple Silicon, no internet required after first launch.

## Download

[Hans Listener v1.0.0 (macOS arm64)](https://pub-ffa24752e25649c1988600fbdf2a7795.r2.dev/hans-listener-1.0.0-arm64.dmg) -- 2.3 GB

> Requires Apple Silicon (M1+). On first launch the TTS model will initialize, which may take a couple of minutes.

## Features

- Offline TTS powered by Qwen3-TTS with zero-shot voice cloning
- Word-level karaoke highlighting synced to audio playback
- Sentence-by-sentence navigation for focused listening
- Adjustable playback speed (0.5x--2.0x)
- MP3/WAV export of synthesized audio
- History with cached audio for previously synthesized text
- macOS native app (arm64)

## Development

```bash
npm install
npm run dev
```

The Python sidecar (`sidecar/server.py`) runs automatically when the Electron app starts. To run it standalone:

```bash
cd sidecar && source .venv/bin/activate && python server.py
```

## Build

```bash
npm run dist
```

Produces a `.dmg` in `dist/`.

## Stack

Electron + electron-vite | React 18 | Tailwind CSS 4 | Qwen3-TTS + mlx-audio | lamejs

## License

MIT
