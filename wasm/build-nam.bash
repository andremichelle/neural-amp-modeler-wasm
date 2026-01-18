#!/bin/bash

# Build script for NAM multi-instance WASM module
# This builds only the 'nam' target (not t3k-wasm-module)

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/build"
DIST_DIR="$ROOT_DIR/dist"

echo "Building NAM multi-instance WASM module..."
echo "Root directory: $ROOT_DIR"

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Clean previous build artifacts for nam target only
rm -f wasm/nam.js wasm/nam.wasm

# Configure with Emscripten
echo "Configuring with Emscripten..."
emcmake cmake "$ROOT_DIR" -DCMAKE_BUILD_TYPE=Release

# Build only the nam target
echo "Building nam target..."
cmake --build . --target nam --config Release -j4

# Create dist directory
mkdir -p "$DIST_DIR"

# Copy WASM files to dist
echo "Copying files to dist..."
cp "$BUILD_DIR/wasm/nam.js" "$DIST_DIR/"
cp "$BUILD_DIR/wasm/nam.wasm" "$DIST_DIR/"

echo ""
echo "Build complete!"
echo "Output files:"
echo "  $DIST_DIR/nam.js"
echo "  $DIST_DIR/nam.wasm"
