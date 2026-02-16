# @lingo-dev/env workspace

Centralized runtime environment validation for server and web packages.

## Key Patterns

- Keep server env contract strict with zod schemas and fail fast on invalid runtime values.
- Use separate entrypoints for server and web env surfaces to avoid accidental secret exposure.
- Set `emptyStringAsUndefined` to normalize empty env inputs before validation.
- Add new required env keys here before consuming them in downstream packages.

## How To: Add a New Environment Variable

1. Decide whether variable is server-only or web-exposed.
2. Add schema validation in the matching env entrypoint.
3. Consume via `@lingo-dev/env/server` or `@lingo-dev/env/web` import only.
4. Update deployment/runtime environment values before rollout.

## Dev Command

- No isolated dev process; validate with `pnpm --filter @lingo-dev/env check-types`
