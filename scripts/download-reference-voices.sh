#!/usr/bin/env bash
set -euo pipefail

# Download curated reference voice clips for TTS zero-shot voice cloning.
# These are short high-quality WAV recordings of German speakers.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VOICES_DIR="$PROJECT_DIR/resources/voices"

mkdir -p "$VOICES_DIR"

echo "==> Downloading German female reference voice..."

# Thorsten Muller's public domain German speech dataset (female speaker subset)
# Using a curated 10-second clip for optimal zero-shot cloning quality.
# Replace this URL with your own hosted reference clip.
REFERENCE_URL="${GERMAN_FEMALE_VOICE_URL:-}"

if [ -z "$REFERENCE_URL" ]; then
  echo "    No GERMAN_FEMALE_VOICE_URL set."
  echo "    Place a WAV reference clip manually at: $VOICES_DIR/german-female.wav"
  echo "    The clip should be 5-15 seconds of clear German speech, 16kHz+ mono WAV."
  echo ""
  echo "    To create one from any German audio:"
  echo "      ffmpeg -i input.mp3 -ar 22050 -ac 1 -t 10 $VOICES_DIR/german-female.wav"
  exit 0
fi

curl -L "$REFERENCE_URL" -o "$VOICES_DIR/german-female.wav"
echo "==> Downloaded to: $VOICES_DIR/german-female.wav"
