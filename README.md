<div align="center">

<h1>
  <img src="public/icon.png" alt="BobrChat" width="128">
  <br>
  BobrChat
</h1>

<p>
  An simple, fast, and open-source AI chat client with multi-model support.
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

---

<!-- TODO: Add screenshot here -->
<!-- ![Screenshot](docs/screenshot.png) -->

## Features

- **Multi-model chat**: access models from OpenAI, Anthropic, Google, Meta, and more via [OpenRouter](https://openrouter.ai)
- **File attachments**: upload and reference files in conversations
- **Shareable threads**: generate public links to share conversations
- **Customizable**: themes, model settings, and system prompts

## Tech Stack

| Layer         | Technology                                                                            |
| :------------ | :------------------------------------------------------------------------------------ |
| **Framework** | [Next.js 16](https://nextjs.org) (App Router), React 19                               |
| **Styling**   | [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), Radix |
| **Database**  | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team)                                |
| **Auth**      | [WorkOS AuthKit](https://workos.com/docs/auth-kit)                                    |
| **AI**        | [Vercel AI SDK](https://sdk.vercel.ai) + [OpenRouter](https://openrouter.ai)          |
| **OG Images** | Cloudflare Workers ([`og/`](og/))                                                     |

## Getting Started

> [!NOTE]
> This project uses [Nix](https://nixos.org) for development tooling and [Bun](https://bun.sh) as the JavaScript runtime.

```bash
# Enter the Nix dev shell (provides the full toolchain)
nix develop

# Install dependencies
bun install

# Start local services (Postgres, etc.)
docker-compose up -d

# Push the database schema
bun db:push

# Start the dev server
bun run dev
```

Copy `.env.example` to `.env` and fill in the required values before running.

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
