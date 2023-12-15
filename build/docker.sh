#!/bin/bash


# THIS ASSUMES THAT THE REPO ROOT IS MOUNTED AT /usr/src/build!


# Change to the mounted output directory.
cd /usr/src/build

# Nuke package.lock to fix a @rollup build error.
rm ./package-lock.json

# Build our WebAssembly core, required further.
npm run wasm

# Install interface dependencies, including the `file:wasm/pkg`.
npm install

# Build our React interface.
npm run build
