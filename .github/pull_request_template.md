# Summary

**TODO:** Describe the changes in this PR.

## Testing

- [ ] Pipelines should be passing
- [ ] **TODO:** Provide steps to test the changes fully

## GraphQL schema (optional)

Complete when this PR changes GraphQL types or resolvers in `openthrottle-server` (see [GraphQL schema and codegen](../CONTRIBUTING.md#graphql-schema-and-codegen)).

- [ ] Regenerated `applications/openthrottle-server/schema.gql` and synced root `schema.gql`
- [ ] Ran consumer codegen (`pnpm run build:graphql` or affected `codegen-graphql` / `codegen-react-router` targets) and committed outputs
- [ ] **Breaking changes:** none, or migration plan documented
- [ ] **Deprecated fields:** removed or renamed fields use `@Field({ deprecationReason: '...' })` (or `@Query` / `@Mutation` / `@ResolveField` equivalents)—do not remove or change existing field types without a migration plan

## URL-first UI (optional)

Complete when this PR adds or changes **dialogs, sheets, drawers**, **multi-step flows**, or **search/filter** behavior tied to the URL (see [URL-first UI state](../docs/monorepo/url-first-ui-state.md)).

- [ ] Search param keys are **feature-prefixed**; closing a **parent** overlay clears **child** params.
- [ ] **`replace` vs push** matches whether **Back** should dismiss layers; use **`preventScrollReset`** on param-only updates when scroll should stay put.
- [ ] Search/filter fields: **local** typing with URL updates on **debounce / blur / submit** (avoid updating the URL every keystroke).
