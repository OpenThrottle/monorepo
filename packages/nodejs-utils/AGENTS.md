# @openthrottle/nodejs-utils — agent notes

Zero-dependency, runtime-agnostic TypeScript utilities shared by both server
(NestJS) and client (React Router) code. Today this is the home for small,
universal **type guards** — starting with `isRecord`. Consumers span
`openthrottle-server`, `openthrottle-developer`, the `nestjs-*` and
`react-router-*` packages, the agentic packages, `node-client`, and
`nodejs-graphql`.

## Layout

- [src/index.ts](src/index.ts) — public entry point. Export the package's public
  API here and tag exported public API with `@public` so Knip keeps it.
- [src/utils/is-record.ts](src/utils/is-record.ts) — `isRecord` type guard
  (plain-object predicate). Canonical name for what used to be inlined as
  `isPlainRecord` / `isPlainObject` / `isObjectRecord` / `isJsonObject` /
  `isObjectValue` across the workspace.

## Invariants & gotchas

- **Not source-first — this package has a real `build` target.** `main`/`module`/
  `types` point at `src/index.ts` (so Vite apps transpile source), but `exports`
  resolve to `dist/`. That dual mapping is deliberate: `openthrottle-server` and
  the NestJS Docker image import from `dist/` and would hit
  `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on raw `.ts`. Always keep the
  `build` target green and `exports` pointing at `dist/`.
- **Zero runtime dependencies, universal code only.** Nothing here may import
  from Node-only, NestJS, or browser/React APIs. Keep it server/client agnostic.
- **Not a grab-bag.** Only add small, genuinely universal utilities (type guards
  and the like). Anything NestJS-specific belongs in `@openthrottle/nestjs-utils`;
  anything React Router / Vite specific belongs in
  `@openthrottle/react-router-utils`.
- Leave domain-specific guards that _compose_ on top of `isRecord` (e.g.
  `isWallClockMetrics`) in their own packages — they call `isRecord`, they don't
  live here.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout,
  `@public` tags, source-first pattern).
