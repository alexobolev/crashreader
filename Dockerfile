FROM rust:1.74

# Install WebAssembly target and Node environment.
RUN rustup target add wasm32-unknown-unknown
RUN apt-get update && apt-get install -y nodejs npm

# Install the prebuilt `wasm-pack` to save some time.
RUN npm install -g wasm-pack

COPY "./build/crashreader.sh" "/usr/src/build-crashreader.sh"
CMD ["/bin/bash", "-c", "/usr/src/build-crashreader.sh"]
