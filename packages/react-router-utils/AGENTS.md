# @openthrottle/react-router-utils — agent notes

Shared config, environment, logging, metadata, CSP, and route action/fetcher utilities the
OpenThrottle React Router apps boot with. No runtime `dependencies`, but `react` and `react-router`
are declared `peerDependencies` (already imported by `useForm` and the fetcher helpers) — the
consuming app provides them. Public API is re-exported from `src/index.ts`.

**Consumed by:** `openthrottle-developer`, `openthrottle-email`, and the `react-router-graphql`,
`react-router-notifications`, `react-router-editor`, and `react-router-testing` packages.

## Layout

- `src/utils/csp.ts` — `buildCsp` nonce-based CSP builder (added in #143), shipped fleet-wide.
- `src/config/*.ts` — `application`, `environment`, `features`, `offline`, `openthrottle`, `artwork`, `defaults` config surfaces.
- `src/utils/{environment,logger,metadata,parsers}.ts` — env parsing, logging, `<head>` metadata helpers.
- `src/utils/parsers.ts` — `parsePagination(searchParams, options)` (+ the `parsePaginationPage` / `parsePaginationLimit` primitives) own the canonical `?page=` / `?limit=` parse; loaders pass route-specific `defaultLimit`/`maxLimit`/`minLimit` rather than re-rolling `Math.max`/`Number` blocks.
- `src/utils/action-result.ts` — readers for **route action JSON** returned to `useFetcher` / `useActionData`: `getActionError`, `isActionFailure`, `isActionSuccess` (+ `ActionResult`/`ActionFailure`/`ActionSuccess` types).
- `src/utils/fetcher.ts` — `Fetcher` predicates: `isFetcherBusy` (`state !== 'idle'`) and `isFetcherFormPending(fetcher, field)` (busy AND a non-empty `formData` field, e.g. an `intent`).
- `src/index.ts` — the barrel; add new public exports here (no deep imports — see [../AGENTS.md](../AGENTS.md)).

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [../AGENTS.md](../AGENTS.md).
- Action/fetcher helpers read **route action JSON** (`{ error }` / `{ ok, error }`), NOT GraphQL
  results. GraphQL `{ data, errors }` unwrapping belongs to `@openthrottle/react-router-graphql`
  (`executeGraphqlWithAuth`, which returns `TData` or throws) — never import GraphQL here.
  `getActionError` is envelope-agnostic (works with or without the `ok` discriminant); call sites
  needing `null` write `getActionError(data) ?? null`. Proving-ground usage:
  `applications/openthrottle-developer/app/routes/skills.$slug.tsx`.
- CSP contract (`buildCsp`): nonce-based via response headers, never a `<meta>` tag. `script-src`
  is `'self'` + per-request nonce + `'strict-dynamic'` (never `'unsafe-inline'`); `connect-src` is
  enumerated from the app's `apiUrl` (origin + its `ws(s)://` equivalent) and degrades to `'self'`
  when no API URL is given; Report-Only is forced outside `NODE_ENV=production`. Extend origins via
  the `additional*Src` options, not by editing the builder. See the file's header JSDoc.

## Pointers

- [README.md](./README.md) — install line.
