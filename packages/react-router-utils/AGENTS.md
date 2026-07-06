# @openthrottle/react-router-utils — agent notes

Shared config, environment, logging, metadata, and CSP utilities the OpenThrottle React Router apps
boot with. Zero runtime dependencies; public API is re-exported from `src/index.ts`.

**Consumed by:** `openthrottle-developer`, `openthrottle-email`, and the `react-router-graphql`,
`react-router-notifications`, `react-router-editor`, and `react-router-testing` packages.

## Layout

- `src/utils/csp.ts` — `buildCsp` nonce-based CSP builder (added in #143), shipped fleet-wide.
- `src/config/*.ts` — `application`, `environment`, `features`, `offline`, `openthrottle`, `artwork`, `defaults` config surfaces.
- `src/utils/{environment,logger,metadata,parsers}.ts` — env parsing, logging, `<head>` metadata helpers.
- `src/index.ts` — the barrel; add new public exports here (no deep imports — see [../AGENTS.md](../AGENTS.md)).

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [../AGENTS.md](../AGENTS.md).
- CSP contract (`buildCsp`): nonce-based via response headers, never a `<meta>` tag. `script-src`
  is `'self'` + per-request nonce + `'strict-dynamic'` (never `'unsafe-inline'`); `connect-src` is
  enumerated from the app's `apiUrl` (origin + its `ws(s)://` equivalent) and degrades to `'self'`
  when no API URL is given; Report-Only is forced outside `NODE_ENV=production`. Extend origins via
  the `additional*Src` options, not by editing the builder. See the file's header JSDoc.

## Pointers

- [README.md](./README.md) — install line.
