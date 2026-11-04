# @openthrottle/nestjs-mcp-developer — agent notes

Pure re-export shim: forwards the developer Nest MCP surface from
`@openthrottle/openthrottle-mcp` (its `/nest` subpath) plus the
`withMcpDeveloperAuthToken(Async)` wrappers. No local implementation — change behavior
upstream in [`packages/openthrottle-mcp`](../openthrottle-mcp/), not here.

**Consumed by:** `openthrottle-server` (`src/modules/mcp-developer/`,
`src/graphql/agents/`).

## Invariants & gotchas

- Upstream file names still say `openthrottle-mcp`: the implementation this shim
  forwards lives in `packages/openthrottle-mcp/src/nest/nestjs-openthrottle-mcp.*`,
  even though every symbol it exports is `NestjsMcpDeveloper*`. Change behavior there.
- `src/index.ts` is the entire source (one re-export file + a smoke test). Its
  `export * from '@openthrottle/openthrottle-mcp/nest'` is an intentional subpath
  consumption — the shim exists precisely so other consumers get a stable main entry
  instead of deep-importing.
- ESM (`"type": "module"`), unlike the commonjs sibling `nestjs-*` packages — but it
  is built like every other `technology:nestjs` package, not source-first. That is a
  blanket rule, not a property of this package; see
  [docs/monorepo/source-first-packages-and-strip-only.md](../../docs/monorepo/source-first-packages-and-strip-only.md).
  `build` has `dependsOn: ["^build"]` so upstream `openthrottle-mcp` builds first.

## Pointers

- [README.md](./README.md)
