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
- [src/utils/isRecord.ts](src/utils/isRecord.ts) — `isRecord` type guard
  (plain-object predicate). Canonical name for what used to be inlined as
  `isPlainRecord` / `isPlainObject` / `isObjectRecord` / `isJsonObject` /
  `isObjectValue` across the workspace.

## Invariants & gotchas

- **Source-first, no `build` target.** `main`, `module`, `types` and the single
  `exports["."]` entry all name `./src/index.ts`; `nx.targets` parks `__build`
  (#540). Vite consumers transpile the source, and Node consumers (including
  `tools/workflows` through CommonJS `require()`) load it with Node's native
  type stripping. That rests on the root `engines.node` floor, not on the
  consumer graph.
- **Keep it strip-only.** Node's loader rejects `enum`, `namespace`, constructor
  parameter properties and decorators in raw `.ts`, so a single one here breaks
  every Node consumer at runtime, in their tests rather than ours. See
  [source-first-packages-and-strip-only.md](../../docs/monorepo/source-first-packages-and-strip-only.md).
- **`types` is the first `exports` condition and `default` the last.** Conditions
  match in written order, so a `types` after `default` is unreachable, and
  esbuild warned about it on every hook bundle in `build:hooks`.
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
