#!/usr/bin/env bash
set -euo pipefail

# Downloads German Piper TTS voice models
# https://huggingface.co/rhasspy/piper-voices

BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VOICES_DIR="${PROJECT_DIR}/resources/voices"

VOICES=(
  "de/de_DE/thorsten/high/de_DE-thorsten-high"
  "de/de_DE/kerstin/low/de_DE-kerstin-low"
  "de/de_DE/ramona/low/de_DE-ramona-low"
)

mkdir -p "$VOICES_DIR"

for voice_path in "${VOICES[@]}"; do
  voice_name="$(basename "$voice_path")"
  onnx_file="${VOICES_DIR}/${voice_name}.onnx"
  json_file="${VOICES_DIR}/${voice_name}.onnx.json"

  if [[ -f "$onnx_file" && -f "$json_file" ]]; then
    echo "Voice ${voice_name} already exists, skipping"
    continue
  fi

  echo "Downloading voice: ${voice_name}..."

  curl -L "${BASE_URL}/${voice_path}.onnx" -o "$onnx_file"
  curl -L "${BASE_URL}/${voice_path}.onnx.json" -o "$json_file"

  echo "  Downloaded: ${voice_name} ($(du -h "$onnx_file" | cut -f1))"
done

echo "=== All voices downloaded ==="
ls -lh "$VOICES_DIR"
