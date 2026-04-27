<div align="center">

<h1>
  <img src="public/icon.png" alt="BobrChat" width="128">
  <br>
  BobrChat
</h1>

<p>
  Pay only for what you use. Chat with Claude, GPT-5, Llama, and 200+ models
in one place.
  <br>
  See exactly what each message costs. No subscription plans,
no lock-in.
  <br><br>
  <a href="#features">Features</a>
  ·
  <a href="#getting-started">Getting Started</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
  ·
  <a href="LICENSE">License</a>
</p>

[![Lint](https://github.com/bobrware/bobrchat/actions/workflows/lint.yaml/badge.svg)](https://github.com/bobrware/bobrchat/actions)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-blue.svg)](LICENSE)

</div>

![A video of BobrChat answering a request](https://github.com/user-attachments/assets/2a2afae0-55ff-435a-b744-64ed05aa780e)

## Why BobrChat?

- **Pay only for what you use**: Real-time cost breakdown per message. No $20/mo plans you forget about.
- **Compare models instantly**: Switch between Claude, GPT, Llama, and 200+ others. See which is cheapest for your use case.
- **Your keys, your control**: Store API keys locally or encrypted on our servers. We don't charge you for the API usage.
- **File attachments & web search**: Upload files and search the web. Get real answers, not hallucinations.
- **Open source**: Full source code available. No vendor lock-in.

## How BobrChat Compares

| Feature                     | **BobrChat**                  | ChatGPT Plus      | Claude Pro        | Perplexity Pro    | t3.chat                    |
| --------------------------- | ----------------------------- | ----------------- | ----------------- | ----------------- | -------------------------- |
| **Monthly Cost**            | $0–$2.99                      | $20               | $20               | $20               | $8                         |
| **Pricing Model**           | Pay-per-token\*               | Flat subscription | Flat subscription | Flat subscription | Flat subscription + limits |
| **Model Selection**         | 200+ via OpenRouter           | 1 (GPT only)      | 1 (Claude only)   | 5+ models         | ~30 models                 |
| **Cost Visibility**         | ✓ Per-message breakdown       | ✗ Hidden          | ✗ Hidden          | ✗ Hidden          | ✗ Hidden                   |
| **Bring Your Own API Keys** | ✓ All tiers                   | ✗                 | ✗                 | ✗                 | ✗ On paid plans            |
| **Free Tier**               | ✓ Full BYOK support           | ✗                 | ✗                 | ✗                 | Limited (trial)            |
| **Usage Limits**            | ✗ None (pay what you use)     | ✓ Undisclosed     | ✓ Undisclosed     | ✓ Rate-limited    | ✓ "Credits" system         |
| **Web Search**              | ✓ Parallel.ai                 | ✓                 | ✓                 | ✓                 | ✓                          |
| **File Attachments**        | ✓                             | ✓                 | ✓                 | ✓                 | ✓                          |
| **Open Source**             | ✓ (BSL 1.1→MIT Jan 2027)      | ✗                 | ✗                 | ✗                 | ✗                          |
| **Data Privacy**            | ✓ Encrypted, local key option | ? Proprietary     | ? Proprietary     | ? Proprietary     | ? Proprietary              |
| **Shareable Conversations** | ✓                             | ✓                 | ✓                 | ✓                 | ✓                          |

\*All users (free and Plus) can bring their own API keys. Plus tier ($2.99/mo) adds: unlimited threads, 100MB file storage, priority support.

## Tech Stack

| Layer         | Technology                                                                                              |
| :------------ | :------------------------------------------------------------------------------------------------------ |
| **Framework** | [Next.js 16](https://nextjs.org) (App Router), React 19                                                 |
| **Hosting**   | [Cloudflare Workers](https://workers.cloudflare.com) via [OpenNext](https://opennext.js.org/cloudflare) |
| **Styling**   | [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), Radix                   |
| **Database**  | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team)                                                  |
| **Auth**      | [WorkOS AuthKit](https://workos.com/docs/auth-kit)                                                      |
| **AI**        | [Vercel AI SDK](https://sdk.vercel.ai) + [OpenRouter](https://openrouter.ai)                            |
| **Storage**   | [Cloudflare R2](https://developers.cloudflare.com/r2/)                                                  |
| **OG Images** | Cloudflare Workers ([`og/`](og/))                                                                       |

## Getting Started

> [!NOTE]
> This project uses [Nix](https://nixos.org) for development tooling and [Bun](https://bun.sh) as the JavaScript runtime.
> The app is deployed to [Cloudflare Workers](https://workers.cloudflare.com) via [OpenNext](https://opennext.js.org/cloudflare).

```bash
# Enter the Nix dev shell (provides the full toolchain)
nix develop

# Install dependencies
bun install

# Start local services (Postgres, etc.)
docker-compose up -d

# Push the database schema
bun db:push

# Copy .env.example to .env and fill in the required values
cp .env.example .env

# Start the dev server
bun run dev
```

### Preview & Deploy (Cloudflare)

```bash
# Build and preview locally with Wrangler
bun run preview

# Build and deploy to Cloudflare Workers
bun run deploy
```

Cloudflare-specific environment variables for local preview go in `.dev.vars` (see [Wrangler docs](https://developers.cloudflare.com/workers/configuration/secrets/)).

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── (main)/           #   Authenticated app shell (chat, settings)
│   ├── auth/             #   Login / signup pages
│   ├── share/            #   Public shared thread views
│   └── api/              #   API routes
├── features/             # Feature modules
│   ├── chat/             #   Chat UI, actions, queries, store
│   ├── auth/             #   Session, auth actions, hooks
│   ├── attachments/      #   File upload & management
│   ├── settings/         #   User preferences
│   ├── models/           #   Model configuration
│   └── landing/          #   Landing page
├── components/ui/        # Shared UI primitives (shadcn/Radix)
├── lib/                  # Utilities, DB config, env, security
└── types/                # Global TypeScript declarations
og/                       # Cloudflare Worker for OG image generation
```

Each feature folder follows a consistent layout: `components/`, `hooks/`, `server/`, `types.ts`, `queries.ts`, and `actions.ts`.

## License

This project is licensed under the [Business Source License 1.1](LICENSE).
