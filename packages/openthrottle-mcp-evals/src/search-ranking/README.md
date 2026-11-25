# Search-ranking evals

Checks that `semantic_search` surfaces the right plans, tasks and documentation for a query, and how high
it ranks them. It exists to decide whether hybrid ranking (vector + full-text, merged with reciprocal rank
fusion) beats vector-only search (OT plan e5397271). That decision is made on identifier queries
especially: short plan ids, file names, env vars, error codes. Embeddings rank those poorly.

How suites run in general is in
[docs/openthrottle/evals-running-suites.md](../../../../docs/openthrottle/evals-running-suites.md).

## Run it (on demand, never in CI)

Start a server on the knowledge base the cases were labelled against. A worktree's server shares the
primary database unless it was isolated:

```bash
pnpm worktree:serve server --api-only
OPENTHROTTLE_MCP_AUTH_TOKEN=… pnpm nx run @openthrottle/openthrottle-mcp-evals:eval-search-ranking -- --url http://localhost:7161
pnpm nx run @openthrottle/openthrottle-mcp-evals:eval-search-ranking -- --case identifier
```

| Flag     | Default                                          | Meaning                                     |
| -------- | ------------------------------------------------ | ------------------------------------------- |
| `--url`  | `API_URL_INTERNAL`, else `http://localhost:6021` | Server base URL (`/graphql` is appended)    |
| `--case` | all                                              | Comma list of case ids, kinds and/or splits |

Each case is searched twice, with `mode: "semantic"` (the vector-only baseline) and `mode: "hybrid"`, and
the run writes `tmp/evals/search-ranking/<timestamp>.json`. It spends no model tokens. The exit code is the
**ship rule** in [`compareSearchModes.ts`](./compareSearchModes.ts):

- 0 (ship): no overall or topic MRR drop beyond 0.01, no drop in topic hit@10, and an identifier MRR gain
  of at least 0.05;
- 1 (hold): any of those fails, or the server answered some case in a different mode (a lexical fallback),
  so the numbers do not measure the mode they claim;
- 2: a usage or connection error.

## Result that made hybrid the default (2026-11-15)

Dataset v1 (38 cases), primary knowledge base, local nomic-embed-text-v1.5:

| Run         | Kind       | MRR   | hit@10 | recall@10 |
| ----------- | ---------- | ----- | ------ | --------- |
| vector-only | overall    | 0.577 | 0.737  | 0.657     |
| hybrid      | overall    | 0.822 | 0.921  | 0.916     |
| vector-only | identifier | 0.339 | 0.579  | 0.418     |
| hybrid      | identifier | 0.737 | 0.895  | 0.884     |
| vector-only | topic      | 0.816 | 0.895  | 0.895     |
| hybrid      | topic      | 0.908 | 0.947  | 0.947     |

The paired hit@10 difference is +0.184 (95% CI 0.079 to 0.316, McNemar p = 0.016), and no case ranked
lower under hybrid. On the held-out `test` split (8 cases), MRR went from 0.458 to 0.875 and hit@10 from
0.625 to 1.000. Three cases still miss in both modes: `id-pnpm-workspace-state`, `id-esm-bundlers-doc`
and `topic-compose-topology-doc`.

## Cases

[`data/cases.ts`](./data/cases.ts) holds the cases. Each one is a query, a `kind`
(`identifier` or `topic`), a `split`, and a `relevant` gold set of targets:

| Target          | Matches                                                  |
| --------------- | -------------------------------------------------------- |
| `plan`          | the plan itself, or any of its tasks (same unit of work) |
| `task`          | that task only                                           |
| `documentation` | the documentation row with that repo-relative `path`     |

The cases were labelled against the **primary OpenThrottle knowledge base** on 2026-11-15, so gold ids are
real ids in that database. A different database (a fresh `--own-db` worktree, a teammate's) will not
contain them, and the suite is meaningless there.

Authoring rules:

- **Identifier gold sets are mechanical.** A plan or task is in the set when its title, summary or
  description contains the query verbatim (case-insensitive). List a plan, not its tasks, when the plan
  itself matches, because a `plan` target already accepts its tasks.
- **Topic gold sets are by hand.** Name the one plan (or doc) a person asking that question wants. Word the
  query the way someone would ask it, not as the plan title.
- **Ids are stable.** Reports key on them, so rename a case only by deleting it and adding a new one. Bump
  `SEARCH_RANKING_DATASET_VERSION` when a gold set changes.

## Metrics

[`scoring.ts`](./scoring.ts) grades one ranked list per case. Every metric is deterministic, and the same
query always ranks the same way, so one trial per case is enough:

- **MRR**: the reciprocal rank of the first relevant chunk, 0 when none is ranked.
- **hit@10**: whether any relevant chunk is in the top 10.
- **recall@10**: the share of the gold set found in the top 10.

Each is reported overall and per `kind`. CI runs only the scoring and ship-rule tests and the offline
case-integrity checks.
