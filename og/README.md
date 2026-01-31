# OG Image Generation

Dynamic Open Graph image generation for BobrChat, served from Cloudflare Workers.

## Routes

- `GET /` or `/default` – Default site OG image
- `GET /share/:shareId` – Dynamic image for shared thread (queries DB for title, model, preview message)

## Setup

```bash
bun install
```

## Development

```bash
# Start local worker (uses DATABASE_URL for DB connection)
bun run dev
```

## Deployment

Push to `main` to auto-deploy via GitHub Actions.

## Tech

- [Cloudflare Workers](https://workers.cloudflare.com) + [cf-wasm/og](https://github.com/cloudflare/wasm-og)
- TypeScript + Bun
- Neon Postgres + Hyperdrive for production pooling
