#!/usr/bin/env bash
set -euo pipefail

# Build the TTS engine sidecar as a bundled Python venv.
# MLX native extensions don't survive PyInstaller, so we bundle the full venv.
# Must be run on arm64 (MLX requires Apple Silicon).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SIDECAR_DIR="$PROJECT_DIR/sidecar"

ARCH="$(uname -m)"
if [ "$ARCH" != "arm64" ] && [ "$ARCH" != "aarch64" ]; then
  echo "Error: MLX requires Apple Silicon (arm64). Current arch: $ARCH"
  exit 1
fi

OUTPUT_DIR="$PROJECT_DIR/resources/tts-engine/arm64"

echo "==> Building TTS engine sidecar for arm64"
echo "    Output: $OUTPUT_DIR"

cd "$SIDECAR_DIR"

# Create a fresh venv for bundling
BUNDLE_VENV="$SIDECAR_DIR/.venv-bundle"
if [ -d "$BUNDLE_VENV" ]; then
  rm -rf "$BUNDLE_VENV"
fi

echo "==> Creating bundled Python venv..."
uv venv "$BUNDLE_VENV"
source "$BUNDLE_VENV/bin/activate"

echo "==> Installing dependencies..."
uv pip install -r requirements.txt

echo "==> Copying venv + server to output..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy the venv (bin, lib, include, pyvenv.cfg)
cp -R "$BUNDLE_VENV/"* "$OUTPUT_DIR/"
# Copy server script
cp "$SIDECAR_DIR/server.py" "$OUTPUT_DIR/server.py"

deactivate
rm -rf "$BUNDLE_VENV"

echo "==> Done. Sidecar at: $OUTPUT_DIR"
echo "    Test with: $OUTPUT_DIR/bin/python3 $OUTPUT_DIR/server.py --port 8321"
