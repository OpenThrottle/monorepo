# @openthrottle/nestjs-openthrottle-mcp — agent notes

Pure re-export shim: forwards the developer Nest MCP surface from
`@openthrottle/openthrottle-mcp` (its `/nest` subpath) plus the
`withMcpDeveloperAuthToken(Async)` wrappers. No local implementation — change behavior
upstream in [`packages/openthrottle-mcp`](../openthrottle-mcp/), not here.

**Consumed by:** `openthrottle-server` (`src/modules/mcp-developer/`,
`src/graphql/agents/`).

## Invariants & gotchas

- Directory ≠ project name: the folder is `packages/nestjs-mcp-developer` but the Nx
  project/package is `@openthrottle/nestjs-openthrottle-mcp` — targets run as
  `pnpm nx run @openthrottle/nestjs-openthrottle-mcp:<target>`.
- `src/index.ts` is the entire source (one re-export file + a smoke test). Its
  `export * from '@openthrottle/openthrottle-mcp/nest'` is an intentional subpath
  consumption — the shim exists precisely so other consumers get a stable main entry
  instead of deep-importing.
- ESM (`"type": "module"`), unlike the commonjs sibling `nestjs-*` packages. Built;
  `build` has `dependsOn: ["^build"]` so upstream `openthrottle-mcp` builds first.

## Pointers

- [README.md](./README.md)
