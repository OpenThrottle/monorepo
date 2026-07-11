# @openthrottle/nestjs-testing — agent notes

The shared home for **reusable NestJS / backend testing utilities** — the backend
counterpart to [`@openthrottle/react-router-testing`](../react-router-testing/AGENTS.md)
(which covers the React Router apps). When backend/NestJS test code needs a shared helper
(typed mocks, provider/module test harnesses, GraphQL/controller test fixtures), it belongs
here rather than being re-derived per package.

**Status:** freshly scaffolded — `src/index.ts` still exports a `REMOVE_ME` placeholder and
`src/nestjs-testing.module.ts` / `.service.ts` are generator stubs. Replace them with real
exports as utilities land; the empty `src/{config,controllers,graphql,modules,services,tokens}`
folders mirror the intended surface area.

## What belongs here

- **Generic, dependency-free test helpers.** The motivating example is the typed-mock overload
  adapter surfaced repeatedly during the as-cast cleanup: `asMock<T>(value: unknown): T`
  (public generic overload + `unknown`-typed implementation), plus small guards like `isRecord`.
- NestJS-specific test harnesses (e.g. building a `TestingModule`, provider/token overrides,
  GraphQL resolver/controller test setup) as they emerge.

## What does NOT belong here

- **Consumer-specific types.** Keep exports generic — do not couple this package to another
  package's domain types. For example, Ralph's `asExecuteGraphqlV2` (typed to
  `WorkflowExecuteGraphqlV2`) must **not** move here verbatim (it would make nestjs-testing
  depend on the workflows package); callers should instead write
  `asMock<WorkflowExecuteGraphqlV2>(...)`.
- React Router / jsdom test setup — that lives in `@openthrottle/react-router-testing`.

## Pointers

- [../AGENTS.md](../AGENTS.md) — packages-tier conventions (`@public` tags, package layout).
- [../react-router-testing/AGENTS.md](../react-router-testing/AGENTS.md) — the RR-side sibling.
