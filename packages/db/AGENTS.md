# @lingo-dev/db workspace

Database workspace that owns Prisma schema/client generation and PostgreSQL lifecycle scripts.

## Key Patterns

- Initialize Prisma client with the PostgreSQL adapter and shared validated `DATABASE_URL`.
- Keep Prisma schema as source of truth for generated client types and migrations.
- Treat auth-related tables as first-class schema models used by Better Auth.
- Use package scripts for container lifecycle plus Prisma push/migrate/generate workflows.
- Export one reusable Prisma client instance for upstream packages.

## How To: Add a New Database Model

1. Add model fields/relations in Prisma schema files.
2. Run `pnpm db:generate` from root (or filtered equivalent) to regenerate client.
3. Run `pnpm db:migrate` for migration-based changes or `pnpm db:push` for sync-only flow.
4. Update consuming package logic (`api`/`auth`) to use generated types safely.

## Dev Command

- `pnpm --filter @lingo-dev/db db:watch`
