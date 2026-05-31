FROM rust:1.95-slim AS builder
WORKDIR /app

# Cache dependency compilation separately from source changes
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo 'fn main(){}' > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/.fingerprint/udp_listener*

COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/udp_listener /usr/local/bin/udp_listener
CMD ["udp_listener"]
