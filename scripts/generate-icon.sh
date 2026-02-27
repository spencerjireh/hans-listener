#!/usr/bin/env bash
set -euo pipefail

# Generate build/icon.icns from scratch using Pillow + macOS iconutil.
# Requires: sidecar/.venv with Pillow installed, macOS sips + iconutil.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/build"
PYTHON="$PROJECT_DIR/sidecar/.venv/bin/python3"

if [ ! -x "$PYTHON" ]; then
  echo "Error: sidecar venv not found at $PYTHON"
  echo "Run: cd sidecar && uv venv && uv pip install -r requirements.txt"
  exit 1
fi

TMPDIR_ICON="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_ICON"' EXIT

BASE_PNG="$TMPDIR_ICON/icon_1024.png"
ICONSET="$TMPDIR_ICON/icon.iconset"

echo "==> Generating 1024x1024 base icon..."

"$PYTHON" - "$BASE_PNG" << 'PYEOF'
import sys
from PIL import Image, ImageDraw, ImageFont

out_path = sys.argv[1]
SIZE = 1024
CORNER_RADIUS = int(SIZE * 0.22)

# Brand colors from styles.css
BG_COLOR = (168, 104, 20)     # brand-600 #a86814
BORDER_COLOR = (77, 45, 14)   # brand-900 #4d2d0e
TEXT_COLOR = (255, 255, 255)   # white

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Rounded rectangle background
border_width = int(SIZE * 0.03)
draw.rounded_rectangle(
    [0, 0, SIZE - 1, SIZE - 1],
    radius=CORNER_RADIUS,
    fill=BG_COLOR,
    outline=BORDER_COLOR,
    width=border_width,
)

# "HL" text centered
font_size = int(SIZE * 0.46)
try:
    font = ImageFont.truetype(
        "/System/Library/Fonts/HelveticaNeue.ttc", font_size, index=1  # Bold
    )
except OSError:
    font = ImageFont.load_default()

bbox = draw.textbbox((0, 0), "HL", font=font)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
x = (SIZE - tw) / 2 - bbox[0]
y = (SIZE - th) / 2 - bbox[1]
draw.text((x, y), "HL", fill=TEXT_COLOR, font=font)

img.save(out_path, "PNG")
print(f"    Base PNG: {out_path}")
PYEOF

echo "==> Creating iconset with all required sizes..."
mkdir -p "$ICONSET"

# Required sizes: 16, 32, 128, 256, 512 at 1x and 2x
for size in 16 32 128 256 512; do
  size2x=$((size * 2))
  sips -z "$size" "$size" "$BASE_PNG" --out "$ICONSET/icon_${size}x${size}.png" > /dev/null 2>&1
  sips -z "$size2x" "$size2x" "$BASE_PNG" --out "$ICONSET/icon_${size}x${size}@2x.png" > /dev/null 2>&1
done

echo "==> Converting to .icns..."
mkdir -p "$BUILD_DIR"
iconutil --convert icns "$ICONSET" --output "$BUILD_DIR/icon.icns"

echo "==> Done: $BUILD_DIR/icon.icns ($(du -h "$BUILD_DIR/icon.icns" | cut -f1 | xargs))"
