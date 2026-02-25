# Hans Listener

Offline German text-to-speech desktop app for language learners. Paste or type German text, hear it spoken aloud with karaoke-style word highlighting, and navigate sentence by sentence at your own pace.

Built with Electron, React, and [Piper TTS](https://github.com/rhasspy/piper) -- everything runs locally, no internet required.

## Features

- Offline TTS powered by Piper with multiple German voices
- Word-level highlighting synced to audio playback
- Sentence-by-sentence navigation for focused listening
- Adjustable playback speed
- MP3/WAV export of synthesized audio
- macOS native app (arm64 + x64)

## Development

```bash
npm install
npm run dev
```

Piper binaries and voice models go in `resources/piper/` and `resources/voices/` respectively (gitignored). See the [Piper releases](https://github.com/rhasspy/piper/releases) for downloads.

## Build

```bash
npm run dist
```

Produces a `.dmg` in `dist/`.

## Stack

Electron + electron-vite | React 18 | Tailwind CSS 4 | Piper TTS | lamejs

## License

MIT
