# @openthrottle/nestjs-github — agent notes

GitHub REST access (`GitHubService`: pulls, issues, reviews) plus a GraphQL feature module
(`GithubGraphqlModule`) exposing PR/merge analytics resolvers.

**Consumed by:** `openthrottle-server` only (`GithubGraphqlModule` in `app.module.ts`).

## Layout

- `src/github/` — `GitHubService` (REST client, typed response subsets, `dto/`),
  `GitHubController` (REST surface under `github/repos`, behind the server's global auth guard),
  `GitHubModule`.
- `src/graphql/` — `GithubResolver` + `GitHubStatsService` (cycle time, lines added/deleted,
  PR counts by author/label, time-in-state) and one `*.object.ts` per result type;
  `github-graphql.module.ts` re-exports `GitHubModule` so consumers can inject `GitHubService`.

## Invariants & gotchas

- **The GraphQL objects/inputs here land in the server's schema.** Changing anything in
  `src/graphql/` changes the committed `applications/openthrottle-server/schema.gql` — the full
  schema/codegen flow from the root docs applies (boot server, run consumer codegen), and
  schema-evolution rules (deprecate, never break) apply too.
- `GitHubService` reads `GITHUB_TOKEN` via `ConfigService` at request time; the consuming app
  must have `ConfigModule` available (the server's is global). There is no module-level token
  option.
- `LIST_ALL_PULLS_MAX_PAGES = 10` (× 100/page) deliberately bounds stat aggregations at ~1000
  most-recent PRs so one query can't loop unboundedly against the GitHub API — don't remove the
  cap; stats over larger repos are truncated by design.
- The REST controller strictly validates `state`/`merged` query params (400 on anything
  unexpected) — keep new params on that pattern rather than silent coercion.
- Built package (`build` via `@nx/js:tsc`, `exports` → `dist/`) — see [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](./README.md) — build/watch commands, workspace-private install note.
