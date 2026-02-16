# lingo-dev AGENTS Guide

Lingo-dev is a Turbo-managed PNPM monorepo for a Next.js app with typed API, auth, and database packages.

## Stack

- Next.js App Router + React 19
- tRPC server/client with TanStack Query
- Better Auth for session auth
- Prisma 7 + PostgreSQL
- AI SDK (Google provider) for chat streaming
- Tailwind CSS 4 + Base UI + shadcn/ui
- TypeScript (strict) + Turborepo + Oxlint/Oxfmt

## Commands

| Command            | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `pnpm dev`         | Run all dev tasks in Turbo (persistent graph).       |
| `pnpm dev:web`     | Run only the web app dev server.                     |
| `pnpm check-types` | Run TypeScript checks across workspaces.             |
| `pnpm check`       | Run Oxlint, then format with Oxfmt.                  |
| `pnpm db:start`    | Start PostgreSQL via Docker Compose in DB workspace. |
| `pnpm db:migrate`  | Run Prisma dev migrations (interactive/persistent).  |
| `pnpm db:generate` | Regenerate Prisma client from schema.                |
| `pnpm db:studio`   | Open Prisma Studio.                                  |

## Installing Dependencies

- Add to root workspace: `pnpm add -w <pkg>`
- Add to specific workspace: `pnpm add --filter web <pkg>` or `pnpm add --filter @lingo-dev/api <pkg>`
- Internal package dependency: `pnpm add --filter web @lingo-dev/auth@workspace:*`
- Add dev dependency in workspace: `pnpm add -D --filter @lingo-dev/db <pkg>`
- Workspace names used here: `web`, `@lingo-dev/api`, `@lingo-dev/auth`, `@lingo-dev/db`, `@lingo-dev/env`, `@lingo-dev/config`

## Code Style

- Follow user rule: do not add code comments unless explicitly requested.
- Follow user rule: keep implementations simple; avoid overengineering.
- Preserve strict TypeScript compatibility (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`).
- Keep API contracts typed end-to-end (router types consumed directly by client proxy).
- Use PNPM for all JS/TS dependency and script operations.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give a list of unresolved questions to answer, if any.

## Architecture

- `web` -> Next.js UI, route handlers, and client integrations for API/auth/AI.
- `@lingo-dev/api` -> tRPC primitives, context creation, and application router.
- `@lingo-dev/auth` -> Better Auth server configuration backed by Prisma adapter.
- `@lingo-dev/db` -> Prisma client export plus DB lifecycle/migration scripts.
- `@lingo-dev/env` -> shared runtime env validation for server and web surfaces.
- `@lingo-dev/config` -> shared base TypeScript config.

## Dependency Flow

- `web` -> `@lingo-dev/api`, `@lingo-dev/auth`, `@lingo-dev/env`
- `@lingo-dev/api` -> `@lingo-dev/auth`, `@lingo-dev/db`, `@lingo-dev/env`
- `@lingo-dev/auth` -> `@lingo-dev/db`, `@lingo-dev/env`
- `@lingo-dev/db` -> `@lingo-dev/env`
- `@lingo-dev/env` -> (no internal deps)
- `@lingo-dev/config` -> (shared by all TS workspaces via extends/devDependency)

## Sub-Level Pointers

- `apps/web/AGENTS.md`
- `packages/api/AGENTS.md`
- `packages/auth/AGENTS.md`
- `packages/db/AGENTS.md`
- `packages/env/AGENTS.md`
