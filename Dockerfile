# Build the SolidJS UI first: rust-embed reads web/dist.
FROM node:24-alpine AS web

RUN npm install -g pnpm@12.16.1

WORKDIR /src/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm typecheck && pnpm build

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
