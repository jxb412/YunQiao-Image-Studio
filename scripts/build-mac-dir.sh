#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
export ELECTRON_BUILDER_BINARIES_MIRROR="${ELECTRON_BUILDER_BINARIES_MIRROR:-https://npmmirror.com/mirrors/electron-builder-binaries/}"
export CSC_IDENTITY_AUTO_DISCOVERY=false

if [ ! -d node_modules ]; then
  npm install
fi

npm run build
npx electron-builder --mac dir

echo
echo "Mac .app directory build finished. Check:"
echo "$(pwd)/release/mac"
