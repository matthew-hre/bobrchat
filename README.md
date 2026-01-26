# BobrChat

## Getting Started

```bash
# enter nix dev shell (provides toolchain used by the repo)
nix develop

# install JS deps
bun install

# start local services (Postgres, etc.)
docker-compose up -d

# run the dev server
bun run dev

# migrate the database
bun db:push
```

## Overview

- **Stack:** `Next.js 16` (App Router), React 19, Tailwind v4.
- **DB:** PostgreSQL via Drizzle ORM (`src/lib/db/`).
- **Auth:** better-auth integration (`src/features/auth/` + `src/app/api/auth/`).
- **AI:** Vercel AI SDK + OpenRouter (`src/features/chat/`).

## Structure

- **`src/app/`**: Next App Router pages and API routes. API endpoints live under `src/app/api/*`.
- **`src/components/`**: Shared UI primitives and higher-level components (shadcn/radix based).
- **`src/features/`**: Feature folders (e.g., `chat`, `auth`, `attachments`, `settings`). Each feature typically contains `components/`, `hooks/`, `server/`, `actions.ts`, `queries.ts`, and `types.ts`.
- **`src/lib/`**: Utilities and infra glue: `env.ts`, `db/` (schema + migrations), `api-keys/`, `queries/`, `hooks/`, and more.

## State + Data Flow

- **react-query**: We centralize remote data through a query provider (`src/lib/queries/query-provider.tsx`) and per-feature query files (`src/features/*/queries.ts`). Use react-query for:
  - caching server data (threads, attachments, settings)
  - optimistic updates for user actions
  - invalidation patterns after mutations (see feature `actions.ts` implementations)
- **zustand**: Local client state for UI-only or fast ephemeral state lives in feature stores (e.g., `src/features/chat/store.ts`). Use cases:
  - local UI toggles, ephemeral chat input state
  - session-scoped data shared across components without prop drilling

## Feature Conventions

- Each feature folder follows a similar layout: `components/`, `hooks/`, `server/`, `types.ts`, `queries.ts`, `actions.ts`.
- Server-only logic (database queries, server-side AI calls) belongs in `server/` subfolders or under `src/app/api/*` routes.

## Where to look

- **App shell / routes:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/*`.
- **Chat flow:** `src/features/chat/` — store, actions, queries, components.
- **Auth:** `src/features/auth/` (client config) + `src/app/api/auth/` (backend routes).
- **UI primitives:** `src/components/ui/` for shared building blocks.

## License

This project is licensed under the Business Source License 1.1. See the [LICENSE](LICENSE) file for details.
