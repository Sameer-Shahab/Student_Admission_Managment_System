#!/usr/bin/env bash
set -euo pipefail

# System deps for OpenCV + Tesseract (pytesseract).
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  tesseract-ocr \
  libgl1 \
  libglib2.0-0 \
  ca-certificates

python -m pip install --upgrade pip
pip install -r requirements.txt

