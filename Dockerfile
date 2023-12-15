FROM rust:1.74

# Install WebAssembly target and Node environment.
RUN rustup target add wasm32-unknown-unknown
RUN apt-get update && apt-get install -y nodejs npm

# Install the prebuilt `wasm-pack` to save some time.
RUN npm install -g wasm-pack

COPY ./build/docker.sh build.sh
CMD ["/bin/bash", "build.sh"]
