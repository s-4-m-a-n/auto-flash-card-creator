#!/usr/bin/env bash
# Builds dist/vocab-tracker-<version>.zip for uploading to the Chrome Web Store.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./manifest.json').version")
out="dist/vocab-tracker-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -q -r "$out" manifest.json src icons/*.png -x '*.DS_Store'
echo "$out"
