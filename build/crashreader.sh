#!/bin/bash


# Copy files in mounted input directory to the mounted output directory.
cp -r /usr/src/build-src /usr/src/build-dest

# Change to the mounted output directory.
cd /usr/src/build-dest

# Nuke package.lock to fix a @rollup build error.
rm ./package-lock.json

# Build our WebAssembly core, required further.
npm run wasm

# Install interface dependencies, including the `file:wasm/pkg`.
npm install

# Build our React interface.
npm run build
