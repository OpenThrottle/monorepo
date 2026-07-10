# @openthrottle/nodejs-graphql — agent notes

Fetch-based GraphQL client for React Router loaders/actions and Node scripts against
`openthrottle-server`, driven by codegen `TypedDocumentNode`s. Ships two APIs: **V1**
(`executeGraphql*`, throws, resolves URL from `API_URL_INTERNAL`) and **V2**
(`executeGraphql_v2`, non-throwing `GraphqlV2Result`, caller-supplied URL/token/`signal`).

**Consumed by:** `openthrottle-server`, `openthrottle-workflows`,
`openthrottle-agentic-ralph`, `openthrottle-mcp`, `nestjs-agentic-workflow`.

## Layout

- `src/index.ts` / `src/utils.ts` — V1 client + `getGraphQLUrl`, `parseDateTimeInResponse`.
- `src/graphql-v2.ts` / `src/index-v2.ts` — V2 client, result/failure types, `mapFailure`.

## Invariants & gotchas

- Effectively source-first despite appearances: `package.json` declares a real `build`
  target and `exports` → `./dist/...`, but **every consumer is workspace TypeScript that
  transpiles `src` directly** — nothing imports from `dist`. Validate with
  `lint`/`typecheck`/`test`; the `build`/`__dev` targets are an optional
  standalone emit only.
- Single main entry, named imports only — no supported deep import path (see
  [../AGENTS.md](../AGENTS.md)).
- V1 (`getGraphQLUrl`) requires `API_URL_INTERNAL` (base URL, no `/graphql` — the helper
  appends it) and throws if unset; V2 reads no env inside the client.
- For Ralph/workflow calls prefer `@openthrottle/openthrottle-workflows`'
  `executeWorkflowGraphqlV2`, which wires the workflow token + URL env for you.

## Pointers

- [README.md](./README.md) — full V1-vs-V2 table, examples, exported symbol list.
