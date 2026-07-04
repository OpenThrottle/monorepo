# openthrottle-admin — agent notes

The admin UI (React Router v7 + Vite): users, roles, and permissions (RBAC) backed by
`openthrottle-server` over GraphQL. See [README.md](./README.md).

**Consumed by:** nothing — deployable app (dev port 6022; env in [.env.default](./.env.default)).

## Layout

- `app/routes/` — `flatRoutes` (dotted flat filenames) with a co-located `<route>.tsx.graphql`
  document per route.
- `app/routing/<area>/` — the RBAC feature folders (`home`, `users`, `roles`, `permissions`),
  each with `components/`, `data/`, `hooks/`, `utils/`, `config/`, behind the `~/*` alias.
- `app/entry.server.tsx` + `app/global/config/csp.ts` — nonce-based report-only CSP, same wiring
  as the other RR apps (see gotcha).

## Invariants & gotchas

- **Fresh worktrees fail Vitest at collection** until codegen runs — suites import from
  `app/__generated__/` (`graphql.ts`, `gql.ts`). Run
  `pnpm nx run openthrottle-admin:codegen-graphql` (or the workspace-wide codegen) first.
- **CSP is nonce-based report-only** (#143): `entry.server.tsx` mints a per-request nonce and calls
  the shared `buildCsp(nonce, getCspOptions())`; only per-app origins and the `reportOnly` flag live
  in `app/global/config/csp.ts`, and the builder forces report-only outside `NODE_ENV=production`.
  Add third-party origins via the `additional*Src` arrays, not by loosening the shared builder.
- `tests/setup.ts` is the single `setupReactRouterTest({ env: { APP_NAME: 'openthrottle-admin' } })`
  call (plus the jest-dom type import) — no app-local shims here, unlike the developer app.

## Don't

- Don't hand-edit `app/__generated__/*` — regenerate via codegen.

## Pointers

- [README.md](./README.md) — setup and stack.
