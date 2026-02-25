#!/usr/bin/env bash
set -euo pipefail

# Build the Chatterbox TTS sidecar into a standalone PyInstaller bundle.
# Must be run on the target architecture (arm64 for MPS, x64 for CPU-only).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SIDECAR_DIR="$PROJECT_DIR/sidecar"

ARCH="$(uname -m)"
case "$ARCH" in
  arm64|aarch64) ARCH_DIR="arm64" ;;
  x86_64)        ARCH_DIR="x64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

OUTPUT_DIR="$PROJECT_DIR/resources/chatterbox/$ARCH_DIR"

echo "==> Building Chatterbox sidecar for $ARCH_DIR"
echo "    Output: $OUTPUT_DIR"

# Create and activate venv
cd "$SIDECAR_DIR"

if [ ! -d ".venv" ]; then
  echo "==> Creating Python virtual environment..."
  uv venv .venv
fi

source .venv/bin/activate

echo "==> Installing dependencies..."
# chatterbox-tts pins numpy<1.26 which can't build on Python 3.12+
# The override relaxes that constraint to use a compatible binary wheel
uv pip install -r requirements.txt --override <(echo "numpy>=1.26")
uv pip install pyinstaller

echo "==> Running PyInstaller..."
pyinstaller --noconfirm chatterbox.spec

echo "==> Copying bundle to resources..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
cp -R dist/server/ "$OUTPUT_DIR/server/"

echo "==> Done. Bundle at: $OUTPUT_DIR/server/server"
echo "    Test with: $OUTPUT_DIR/server/server --port 8321"
