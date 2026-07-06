# @openthrottle/react-router-profiling — agent notes

Components and hooks for openthrottle-server **process** metrics: a current-snapshot card (`ServerMetricsCard`, GET `/metrics`) and a plans-queue task-run card (`TaskRunMetricsCard`, GraphQL `job(jobId, queueName: "plans")` atStart/atEnd + deltas). Process-only — no host/system metrics.

**Consumed by:** nothing yet — no workspace `package.json` lists it as a dependency.

## Layout

- [src/config/metrics-api.ts](src/config/metrics-api.ts) — API base URL resolution; the file's header comment is the canonical warning list for this package.
- [src/data/](src/data/) — fetchers (`fetch-server-metrics`, `fetch-job-task-run-metrics`), hand-written GraphQL query strings, request-timeout helper, delta math.
- [src/hooks/](src/hooks/) — `useServerMetrics` (optional polling), `useJobTaskRunMetrics`.
- [src/components/](src/components/) — the two cards, built on `react-router-shadcn`.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **Browser-bundled env reads:** the `process.env.OPENTHROTTLE_API_URL` / `API_URL` fallback in `metrics-api.ts` only works if the consuming app statically replaces those exact expressions (Vite `define`). Without that, the `typeof process` guard short-circuits and it silently falls back to `http://localhost:6010`.
- `setMetricsApiBaseUrl()` mutates a module-level singleton shared across all requests in a server process — never use it for per-request/per-tenant URLs under SSR. Preferred path: pass `apiBaseUrl` explicitly into hooks/fetchers.
- GraphQL here is raw `fetch` with inline query strings — no `__generated__`, no codegen prerequisite for tests. If the server's `job`/`taskRunMetrics` schema changes, these strings and `metrics-types.ts` must be updated by hand.
- Tests use this package's own [vitest.setup.ts](vitest.setup.ts) (ResizeObserver/matchMedia stubs), not `@openthrottle/react-router-testing`.

## Pointers

- [README.md](README.md) — mounting guide and per-component options.
- [tools/workflows/docs/server-and-task-metrics.md](../../tools/workflows/docs/server-and-task-metrics.md) — the metrics design this package renders.
