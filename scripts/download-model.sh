#!/usr/bin/env bash
set -euo pipefail

# Download Chatterbox model weights from HuggingFace into resources/model/.
# These files are bundled into the app so it works fully offline.
#
# Total size: ~3.1 GB
#   t3_cfg.safetensors   ~2.1 GB
#   s3gen.safetensors    ~1.0 GB
#   ve.safetensors       ~5.7 MB
#   tokenizer.json       ~25 KB
#   conds.pt             ~107 KB

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_DIR="$PROJECT_DIR/resources/model"
REPO="ResembleAI/chatterbox"

FILES=(
  ve.safetensors
  t3_cfg.safetensors
  s3gen.safetensors
  tokenizer.json
  conds.pt
)

mkdir -p "$MODEL_DIR"

echo "==> Downloading Chatterbox model weights to $MODEL_DIR"

for file in "${FILES[@]}"; do
  DEST="$MODEL_DIR/$file"
  if [ -f "$DEST" ]; then
    echo "    [skip] $file (already exists)"
    continue
  fi

  echo "    [download] $file ..."
  curl -L "https://huggingface.co/$REPO/resolve/main/$file" -o "$DEST"
done

echo "==> Done. Model weights at: $MODEL_DIR"
du -sh "$MODEL_DIR"
