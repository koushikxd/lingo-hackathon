# web workspace

Next.js App Router frontend that consumes internal API/auth packages and exposes route handlers.

## Key Patterns

- Keep page-level server auth checks on server routes when access-gating views.
- Use `authClient` hooks/actions for client-side session, sign-in, sign-up, sign-out flows.
- Use `trpc` query options with TanStack Query (`useQuery(trpc.someRoute.queryOptions())`).
- API handlers in this workspace are thin adapters that delegate to internal packages.
- Shared providers wire theme, React Query client, query devtools, and toast system once in layout.
- AI chat uses `useChat` with `/api/ai` transport and streams assistant output.

## How To: Add a New tRPC-backed UI Feature

1. Add or extend the procedure in `@lingo-dev/api`.
2. Consume it with `trpc.<procedure>.queryOptions()` in a client component.
3. Handle loading/error/success state through TanStack Query state.
4. If server-side access is required, gate with session check before rendering.

## Dev Command

- `pnpm --filter web dev`
