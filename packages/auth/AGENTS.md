# @lingo-dev/auth workspace

Authentication service configuration using Better Auth with Prisma-backed persistence.

## Key Patterns

- Export a single configured `auth` instance for reuse across server handlers and API context.
- Use Prisma adapter with PostgreSQL provider for Better Auth persistence.
- Source trusted origins and secrets from validated env package values.
- Keep email/password auth enabled unless product requirements change.
- Use Next.js plugin integration so route handlers can expose auth endpoints directly.

## How To: Add or Update Auth Behavior

1. Update Better Auth config on the exported `auth` instance.
2. Keep DB-backed behavior compatible with existing auth Prisma models.
3. Ensure any new required settings are added to shared env validation.
4. Verify server handlers importing this package still expose GET/POST correctly.

## Dev Command

- No isolated dev server; validate via `pnpm --filter @lingo-dev/auth check-types`
