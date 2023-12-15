FROM rust:1.74 as builder

# Install WebAssembly target and Node environment.
RUN rustup target add wasm32-unknown-unknown
RUN apt-get update && apt-get install -y nodejs npm

# Install the prebuilt `wasm-pack` to save some time.
RUN npm install -g wasm-pack

WORKDIR /usr/src/crashreader
COPY . .

# Nuke package.lock to fix a @rollup build error.
RUN rm ./package-lock.json

# Build our WebAssembly core, required further.
RUN npm run wasm

# Install interface dependencies, including the `file:wasm/pkg`.
RUN npm install

# Build our React interface.
RUN npm run build

CMD bash
