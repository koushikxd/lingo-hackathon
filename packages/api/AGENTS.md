# @lingo-dev/api workspace

Typed API layer that defines tRPC context, procedures, and the app router.

## Key Patterns

- Define reusable primitives in the package root (`router`, `publicProcedure`, `protectedProcedure`).
- Build auth-aware context from request headers, then pass into request handlers.
- Place all externally consumed endpoints on `appRouter` with exported `AppRouter` type.
- Use `protectedProcedure` for any endpoint requiring authenticated session access.
- Keep procedures focused on contract + orchestration; depend on internal packages for auth/db access.

## How To: Add a New Procedure

1. Add the procedure on `appRouter` with `publicProcedure` or `protectedProcedure`.
2. Return serializable typed payloads and keep error semantics explicit.
3. Exported router type updates automatically for client inference in `web`.
4. Consume from frontend via `trpc.<name>.queryOptions()` or mutation options.

## Dev Command

- No dedicated long-running dev command; run checks via `pnpm --filter @lingo-dev/api check-types`
