# openthrottle-email — agent notes

Web email client UI (inbox, compose, drafts, sent, trash, search) built as a React Router v7
app with flat file-based routes. UI-first: all mail data is mock until the real API exists;
only health/metrics/auth documents actually hit the GraphQL server.

**Consumed by:** nothing — deployable app (Vercel; `vercel.json`, Vercel preset in
`react-router.config.ts` when `VERCEL=1`).

## Commands

- `node scripts/generate-mock-mail-fixture.mjs` (from this app's root) — regenerates the
  committed mock-mail fixture with seeded faker. This is the only sanctioned way to change
  `app/global/data/mock.mail.fixture.json`.
- `test-e2e` exists (workspace default, cwd `tests/e2e/`) but this app has no `tests/e2e/`
  directory yet — there are no flows to run.

## Layout

- `app/routes.ts` — `flatRoutes()` from `@react-router/fs-routes`; mail screens are
  `app/routes/_layout.mail.*.tsx`, each with a sibling `.graphql` document file (most empty).
- `app/routing/<area>/` — feature folders per mail area: compose, drafts, home, inbox,
  search, sent, trash, plus docs.
- `app/global/data/mock.mail.ts` + `mock.mail.fixture.json` — the stand-in mail "backend"
  read by route loaders.
- `app/root.tsx.graphql` — the only real GraphQL documents (server health, metrics,
  login/register).
- `app/global/config/csp.ts` — this app's CSP options, consumed by `entry.server.tsx`.
- [docs/Architecture.md](./docs/Architecture.md) — route tree, layout, generator usage.

## Invariants & gotchas

- Real GraphQL codegen consumer: `codegen-graphql` is a live target and `app/__generated__/`
  is populated — regenerate after schema/document changes (root CLAUDE.md flow).
- Mock-mail boundary: faker stays in `devDependencies` and out of `app/` code; the fixture is
  generated offline precisely so faker never enters the production bundle.
- CSP (PR #143): `entry.server.tsx` mints a per-request nonce, builds the policy via
  `buildCsp` from `@openthrottle/react-router-utils`, and threads the nonce through
  `NonceContext` + `<ServerRouter nonce>`. Per-app origins and the `reportOnly` flag live in
  `app/global/config/csp.ts` (currently enforcing: `reportOnly: false`); the builder forces
  Report-Only outside `NODE_ENV=production`. New inline scripts must carry the nonce.
- The README links three design docs (CORE_UI_DESIGN, TOOLBAR_DESIGN,
  INTEGRATION_AND_SHADCN_GUIDE) that no longer exist — `docs/Architecture.md` is the only one
  on disk.
- README rule: do not remove code comments (markers) in components or routes — they guide
  future backend integration.

## Pointers

- [README.md](./README.md) — setup, tech stack.
- [docs/Architecture.md](./docs/Architecture.md) — the deep reference for this app.
