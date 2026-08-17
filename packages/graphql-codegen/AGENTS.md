# @openthrottle/graphql-codegen — agent notes

Shared GraphQL Codegen toolchain + config builder for the monorepo. Hoists the
`@graphql-codegen/*` (`client` preset) and `typescript-validation-schema` (Zod) versions,
and exports `defineCodegen()` so per-project `codegen.ts` files declare only their
documents/output dir. Backs the root `codegen-graphql` / `codegen-react-router` flow.

**Consumed by:** the four React Router apps (`openthrottle-developer`, `-admin`, `-email`,
`-website`), `openthrottle-mcp`, `openthrottle-workflows`,
`openthrottle-agentic-ralph`, `openthrottle-developer-codegen`, and the
`@tools/generators` react-router template.

## Layout

- `src/index.ts` — the whole package: `defineCodegen(options)` and the re-exported
  `CodegenConfig` type. Consumers should import `CodegenConfig` from here, not from
  `@graphql-codegen/cli` directly.

## Invariants & gotchas

- Source-first: `__build` / `__build-package` placeholder targets, no `build`
  (see [../AGENTS.md](../AGENTS.md)). Validate with `lint` / `typecheck` / `test`.
- `defineCodegen` resolves the schema from the repo-root
  `applications/openthrottle-server/schema.gql` via a hardcoded relative path, so codegen
  and typecheck work without a running server — do not point it at the app copy.
- `NODE_ENV=development` makes it throw if `API_URL_INTERNAL` is unset; other env values do
  not require it.
- Don't add individual `@graphql-codegen/*` deps to consumers — bump versions here so the
  whole workspace shares one toolchain.

## Pointers

- [README.md](./README.md) — usage and the shared-toolchain rationale.
