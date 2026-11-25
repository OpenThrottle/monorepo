# Code-search evals

Checks that `code_search` (the GraphQL `codeSemanticSearch` query) surfaces the existing code a
reviewer is looking for when a diff adds something that may already exist. It backs the
ot-code-review duplication recipe: semantic search belongs in its detect order only while these
cases hit.

How suites run in general is in
[docs/openthrottle/evals-running-suites.md](../../../../docs/openthrottle/evals-running-suites.md).

## Run it (on demand, never in CI)

The repository must be code-indexed first: `/ide` → Semantic → **Index** in the developer app
(only checkouts indexed this way have code embeddings; worktrees fall back to their primary's
index). Then, from the checkout to search:

```bash
OPENTHROTTLE_MCP_AUTH_TOKEN=… pnpm nx run @openthrottle/openthrottle-mcp-evals:eval-code-search
pnpm nx run @openthrottle/openthrottle-mcp-evals:eval-code-search -- --case intent
```

| Flag               | Default                                          | Meaning                                   |
| ------------------ | ------------------------------------------------ | ----------------------------------------- |
| `--url`            | `API_URL_INTERNAL`, else `http://localhost:6021` | Server base URL (`/graphql` is appended)  |
| `--workspace-path` | the current directory                            | Resolved to the checkout to search        |
| `--repository-id`  | none                                             | A checkout id; wins over `workspace-path` |
| `--case`           | all                                              | Comma list of case ids and/or kinds       |

Each case is searched once and scored on the top 5 (`CODE_SEARCH_K`): reciprocal rank of the first
gold file, hit@5, and precision@5 (the share of the top 5 that are gold files). The run writes
`tmp/evals/code-search/<timestamp>.json`, including every returned path. It spends no model
tokens. Exit codes: 0 when the gate case `body-parse-date` hits in the top 5, 1 when it misses or
code search reports `available: false`, 2 on a usage or connection error.

## Cases

[`data/data.cases.ts`](./data/data.cases.ts): a `body` case pastes the code a diff would add, an
`intent` case describes it in prose. `relevantPaths` is the existing home on the current tree, so a
case whose home moves must be updated (the case-integrity test fails when a gold path disappears).
Bump `CODE_SEARCH_DATASET_VERSION` whenever a gold set changes.
