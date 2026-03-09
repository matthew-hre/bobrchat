# AGENTS.md

## Commands

- `bun run dev` - Start development server.
- `bun run build` - Build for production (also typechecks).
- `bun run lint` - Run ESLint; `bun run lint:fix` to auto-fix linting issues.
- `db:start/stop/push/generate/migrate/migrate:deploy/studio` - Docker Postgres management and Drizzle commands.
  - Do not run these yourself; inform the user to run them instead.

## Architecture

- **Next.js 16** app with App Router (`src/app/`), React 19, Tailwind v4.
- **Database**: PostgreSQL via Drizzle ORM; schema in `src/lib/db/schema/`, migrations in `src/lib/db/migrations/`.
- **Auth**: WorkOS AuthKit (`src/features/auth/lib/session.ts`, `src/features/auth/lib/auth-client.ts`, `src/app/callback/`).
- **AI**: Vercel AI SDK v6 + OpenRouter (`src/features/chat/server/`).
- **Payments**: Polar (`src/lib/polar.ts`, `src/features/subscriptions/`).
- **Email**: Resend (`src/lib/email.ts`).
- **Rate limiting**: Upstash Redis (`src/lib/rate-limit.ts`).
- **State**: Zustand for client state, TanStack React Query for server state.
- **Validation**: Zod v4.
- **Features**: feature modules live under `src/features/` (chat, auth, attachments, settings, models, landing, subscriptions).
- **UI**: Radix primitives + shadcn/ui components (`src/components/ui/`).
- **Shared logic**: reusable queries in `src/lib/queries/`, security utilities in `src/lib/security/`, API key management in `src/lib/api-keys/`.

## Code Style

Code style is enforced via ESLint (see `eslint.config.mjs`). Formatting is handled by ESLint via `@antfu/eslint-config`.

- Use `~/*` path alias for imports from `src/` (e.g., `~/lib/utils`).
- Filenames: `kebab-case` (enforced by eslint).
- Use `type` not `interface` for type definitions.
- Double quotes, semicolons, 2-space indent (eslint config).
- Mark client components with `"use client"` directive. Prefer server components.
- Avoid `process.env` directly; use `~/lib/env` for server env vars and `~/lib/env-client` for client env vars.
- Use `cn()` from `~/lib/utils` for conditional classNames.
