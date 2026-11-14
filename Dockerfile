# Build the mygo UI to WebAssembly first: rust-embed reads web/dist.
FROM golang:1.27 AS web

WORKDIR /src/web
COPY web/go.mod web/go.sum ./
RUN go mod download
COPY web/ ./
RUN go run ./cmd/build

FROM rust:1-slim-bookworm AS server

WORKDIR /src
COPY . .
COPY --from=web /src/web/dist ./web/dist
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=server /src/target/release/finkyo /usr/local/bin/finkyo

EXPOSE 3000
ENTRYPOINT ["finkyo"]
CMD ["/data"]
