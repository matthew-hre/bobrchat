# Contributing to BobrChat

Thanks for your interest! We welcome issues, pull requests, and discussions.

## Setup

```bash
# Enter dev environment (provides toolchain)
nix develop

# Install dependencies
bun install

# Start local services
docker-compose up -d

# Run dev server
bun run dev

# Push database migrations
bun db:push
```

## Development Workflow

1. **Create a branch** for your feature/fix: `git checkout -b feature/my-feature`
2. **Make changes** following code style (see below)
3. **Test locally** with `bun run dev`
4. **Commit** with clear messages
5. **Push** and open a PR

## Code Style

We enforce style via ESLint. This is done automatically when using VSCode.

**Key conventions:**

- Use `~/*` path aliases for imports from `src/` (e.g., `~/lib/utils`)
- Filenames: `kebab-case`
- Types: Use `type` not `interface`
- Quote style: double quotes, semicolons, 2-space indent
- Client components: Add `"use client"` directive; prefer server components
- Environment variables: Import from `~/lib/env`, never `process.env` directly
- Classes: Use `cn()` from `~/lib/utils` for conditional classNames

## Project Structure

See [README.md](./README.md) for architecture details. Key folders:

- **`src/app/`**: Next.js App Router pages and API routes
- **`src/features/`**: Feature folders (chat, auth, attachments, settings, models, landing)
- **`src/lib/`**: Shared utilities, database, auth config, security, and queries
- **`src/components/ui/`**: Shared UI primitives (shadcn/radix)
- **`og/`**: Cloudflare Worker for Open Graph image generation

## Running Tests & Checks

```bash
bun run lint          # Run ESLint
bun run lint:fix      # Auto-fix style issues
bun run build         # TypeScript check + build
```

## Database Changes

If you modify the database schema in `src/lib/db/schema/`:

```bash
bun db:push           # Push migrations
bun db:studio         # Browse data with Drizzle Studio
```

Migrations are generated automatically by Drizzle.

## Commit Messages

Keep your commit messages clear and concise. Prefix your commits with the domain area. Examples:

- `sidebar: fix search bar alignment`
- `chat: clean up markdown rendering`
- `auth: add Codeberg OAuth support`

## Individual Contributor License Agreement (CLA)

By contributing, you agree that your contributions will be licensed under the [Business Source License 1.1](./LICENSE), and you agree to the following terms:

1. **Grant of Rights:** You grant the project owner a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable license to use, reproduce, modify, and distribute your contributions.

2. **Monetization:** You acknowledge that your contributions may be included in paid, hosted, or commercial versions of this software. You are not entitled to any compensation or royalties.

3. **Ownership:** You retain ownership of your original work, but you grant the project owner the right to re-license your contributions under any terms, including the Business Source License 1.1.

4. **Authority:** You represent that you are the legal owner of the code you are contributing and that it does not infringe on any third-party intellectual property.
