# lingo-dev

Lingo-dev helps you understand and localize GitHub repositories faster.

You connect your GitHub account, index a repository into a vector database, generate AI onboarding docs for that repo, and translate markdown files into other languages.

## What the app does

- Auth with GitHub
- Import and index public/private GitHub repositories
- Generate AI onboarding documentation from indexed code
- Save onboarding docs in multiple locales
- Translate markdown files using lingo.dev
- Manage indexed repositories and related generated content

## Tech stack

- Next.js (App Router) + React 19
- tRPC + TanStack Query
- Better Auth
- Prisma + PostgreSQL
- Qdrant (vector store)
- OpenAI (embeddings/content generation)
- Tailwind CSS + shadcn/ui
- Turborepo + PNPM workspaces

## Monorepo structure

```text
apps/web         Next.js app (UI + route handlers)
packages/api     tRPC routers + indexing/retrieval logic
packages/auth    Better Auth setup
packages/db      Prisma schema + Docker services
packages/env     Shared runtime env validation
packages/config  Shared TypeScript config
```

## Prerequisites

- Node.js
- PNPM
- Docker (for local PostgreSQL and Qdrant)
- GitHub OAuth app credentials
- OpenAI API key
- lingo.dev API key

## Environment variables

Set these before running the app:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `OPENAI_API_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_TOKEN` (optional)
- `LINGODOTDEV_API_KEY`
- `NODE_ENV`

## Local setup

```bash
pnpm install
pnpm db:start
pnpm db:push
pnpm dev
```

App runs at `http://localhost:3000`.

## Useful commands

- `pnpm dev` - run all dev tasks
- `pnpm dev:web` - run only the web app
- `pnpm build` - build all packages/apps
- `pnpm check-types` - run TypeScript checks
- `pnpm check` - run oxlint + oxfmt
- `pnpm db:start` - start PostgreSQL + Qdrant via Docker
- `pnpm db:stop` - stop DB containers
- `pnpm db:down` - stop and remove DB containers
- `pnpm db:generate` - regenerate Prisma client
- `pnpm db:migrate` - run Prisma migrations
- `pnpm db:studio` - open Prisma Studio
