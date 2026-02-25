#!/usr/bin/env bash
set -euo pipefail

# Downloads Piper TTS binaries + piper-phonemize libraries for macOS
# Piper: https://github.com/rhasspy/piper/releases
# Phonemize libs: https://github.com/rhasspy/piper-phonemize/releases

PIPER_VERSION="2023.11.14-2"
PHONEMIZE_VERSION="2023.11.14-4"
PIPER_URL="https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}"
PHONEMIZE_URL="https://github.com/rhasspy/piper-phonemize/releases/download/${PHONEMIZE_VERSION}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESOURCES_DIR="${PROJECT_DIR}/resources/piper"

download_piper() {
  local arch="$1"
  local target_dir="${RESOURCES_DIR}/${arch}"
  local piper_archive phonemize_archive

  if [[ "$arch" == "arm64" ]]; then
    piper_archive="piper_macos_aarch64.tar.gz"
    phonemize_archive="piper-phonemize_macos_aarch64.tar.gz"
  else
    piper_archive="piper_macos_x64.tar.gz"
    phonemize_archive="piper-phonemize_macos_x64.tar.gz"
  fi

  if [[ -f "${target_dir}/piper" && -f "${target_dir}/lib/libespeak-ng.1.dylib" ]]; then
    echo "Piper already fully installed for ${arch}, skipping"
    return
  fi

  echo "Downloading Piper for ${arch}..."
  mkdir -p "${target_dir}/lib"

  local tmp_dir
  tmp_dir="$(mktemp -d)"

  # Download and extract piper binary
  curl -L "${PIPER_URL}/${piper_archive}" -o "${tmp_dir}/piper.tar.gz"
  tar -xzf "${tmp_dir}/piper.tar.gz" -C "$tmp_dir"

  cp "${tmp_dir}/piper/piper" "${target_dir}/piper"
  chmod +x "${target_dir}/piper"

  # Copy espeak-ng-data
  if [[ -d "${tmp_dir}/piper/espeak-ng-data" ]]; then
    cp -r "${tmp_dir}/piper/espeak-ng-data" "${target_dir}/"
  fi

  # Download and extract piper-phonemize (contains required dylibs)
  echo "Downloading piper-phonemize libraries for ${arch}..."
  curl -L "${PHONEMIZE_URL}/${phonemize_archive}" -o "${tmp_dir}/phonemize.tar.gz"
  tar -xzf "${tmp_dir}/phonemize.tar.gz" -C "$tmp_dir"

  # Copy dylibs to lib/ directory
  cp "${tmp_dir}/piper-phonemize/lib/libespeak-ng.1.dylib" "${target_dir}/lib/"
  cp "${tmp_dir}/piper-phonemize/lib/libpiper_phonemize.1.dylib" "${target_dir}/lib/"
  cp "${tmp_dir}/piper-phonemize/lib/libonnxruntime.1.14.1.dylib" "${target_dir}/lib/"

  rm -rf "$tmp_dir"

  # Verify binary
  echo "Verifying ${arch} binary:"
  file "${target_dir}/piper"
  echo "Libraries:"
  ls -la "${target_dir}/lib/"*.dylib

  echo "Piper ${arch} downloaded successfully"
}

echo "=== Downloading Piper TTS ==="
download_piper "arm64"
download_piper "x64"
echo "=== Done ==="
