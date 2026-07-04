# openthrottle-website — agent notes

Marketing and landing site (React Router v7, flat routes): home page, markdown docs, FAQ,
component demos, and a `sitemap.xml` resource route. Public and unauthenticated; the smallest
app in the family (two workspace deps: `@openthrottle/graphql-codegen`,
`@openthrottle/react-router-docs`).

**Consumed by:** nothing — deployable app (Vercel; `vercel.json`, Vercel preset in
`react-router.config.ts` when `VERCEL=1`).

## Layout

- `app/routes/_index.tsx` + `app/routing/home/` — landing page.
- `app/routes/docs.$.tsx` + `app/docs-content/` — docs catch-all rendered via
  `@openthrottle/react-router-docs`.
- `app/routes/sitemap[.]xml.tsx` — resource route (mind the escaped-dot filename).
- `app/routing/demos/` — component demos behind the `demos.layout` route.
- `app/global/config/csp.ts` — this app's CSP options, consumed by `entry.server.tsx`.

## Invariants & gotchas

- **No GraphQL here.** `codegen-graphql` is intentionally disabled via
  `____codegen-graphql____` placeholder keys in `package.json` `nx.targets`;
  `app/__generated__/` holds only a `.gitkeep` and `app/root.tsx.graphql` is a commented-out
  stub. Don't "fix" the placeholders — adding a query means re-enabling the target and
  committing generated output. Only `codegen-react-router` runs.
- CSP (PR #143): same nonce wiring as the other apps (`entry.server.tsx` +
  `buildCsp`/`NonceContext`), but the website policy is self-only + nonces with no
  third-party origins. In production `API_URL_EXTERNAL` is absent until openthrottle-server
  ships publicly, so the builder degrades to `connect-src 'self'` with no report directives —
  preview/local is the observation surface (see the comment in `app/global/config/csp.ts`).
- Env plumbing: `vite.config.ts` loads all `.env` keys into `process.env`; there is no
  `VITE_*` surface. Keep `.env.default` aligned with `getEnvironment` in
  `@openthrottle/react-router-utils`. `OFFLINE_MODE=true` serves a placeholder from
  `entry.server.tsx`.
- `test-e2e` exists (workspace default, cwd `tests/e2e/`) but this app has no `tests/e2e/`
  directory yet — there are no flows to run.

## Pointers

- [README.md](./README.md) — env variable details and Vercel deployment notes.
