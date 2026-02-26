#!/usr/bin/env bash
set -euo pipefail

# Download Qwen3-TTS model weights from HuggingFace into resources/model/.
# Uses huggingface_hub's snapshot_download for reliable, resumable downloads.
#
# Model: mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16 (~1.3 GB)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_DIR="$PROJECT_DIR/resources/model"
REPO="mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16"

mkdir -p "$MODEL_DIR"

echo "==> Downloading Qwen3-TTS model to $MODEL_DIR"
echo "    Repo: $REPO"

python3 -c "
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id='$REPO',
    local_dir='$MODEL_DIR',
    local_dir_use_symlinks=False,
)
print('Download complete.')
"

echo "==> Done. Model weights at: $MODEL_DIR"
du -sh "$MODEL_DIR"
