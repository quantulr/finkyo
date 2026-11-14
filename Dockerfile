FROM node:24-alpine AS web

WORKDIR /app/web
RUN npm install -g pnpm@12

COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY web/ ./
RUN pnpm build


FROM rust:1-slim AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY --from=web /app/web/dist ./web/dist

RUN cargo build --release


FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/finkyo /usr/local/bin/finkyo

EXPOSE 3000

ENTRYPOINT ["finkyo"]
CMD ["/data"]
