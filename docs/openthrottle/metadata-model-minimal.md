# Minimal metadata model: tying sources together

Sketch of fields or concepts that could link vector search + markdown + PRD + commits into one story. Builds on [metadata-data-sources-inventory.md](./metadata-data-sources-inventory.md). Intentionally vague; refine later.

## Core concepts

| Concept     | Description                                               | Where it exists today                                                                                       |
| ----------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **plan**    | A PRD or initiative; has tasks, output stream, embeddings | `plans`                                                                                                     |
| **task**    | Work item under a plan; has embeddings                    | `tasks`                                                                                                     |
| **doc**     | Markdown file (docs/ or project README); has embeddings   | `documentation`, `documentation_embeddings`                                                                 |
| **commit**  | Git commit linked to a plan/task after PR merge           | `commit_links`                                                                                              |
| **date**    | When something happened — created, updated, or landed     | `created_at`, `updated_at` everywhere; implicit in `sha`                                                    |
| **project** | NX project or logical grouping                            | `projects`; `plans.project_id`, `tasks.project_id`; `documentation.path` (e.g. `projects/<root>/README.md`) |

## Universal anchors

Two anchors already span multiple sources and can tie the story together:

1. **`repo` + `sha`** — What landed on main. Present in `documentation` and `commit_links`. Plans/tasks do not have repo/sha; they are linked _via_ `commit_links`.
2. **`date`** — When. All tables have `created_at`; `commit_links` and `documentation` both imply a commit date via `sha` (commit timestamp is derivable from the repo).

**Implication:** A "story over time" can be built by:

- Projecting `commit_links` (plan, task, repo, sha, date) as the primary timeline
- Joining `documentation` on `(repo, sha)` or `sha` to show "what docs landed with this commit"
- Using `plans.project_id` / `tasks.project_id` to filter or group by project

## Minimal linking model

```
┌─────────────────────────────────────────────────────────────────────────┐
│  UNIFIED TIMELINE (conceptual)                                          │
│  - commit_links: (plan_id, task_id?, repo, sha, message) → primary      │
│  - documentation: (repo, sha, path) → can join on repo+sha               │
│  - Both share: repo, sha → one commit can have N docs + 1 plan/task link │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   plans      │────▶│   tasks      │     │ documentation│
│   project_id │     │   project_id │     │   path       │
└──────────────┘     └──────────────┘     │   (→ project) │
       │                    │             └──────────────┘
       │                    │                      │
       └────────────────────┼──────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ commit_links │
                    │ repo, sha    │
                    └──────────────┘
```

### Cross-source search (future)

To enable semantic search across plans, tasks, docs, and commits:

1. **Unified embedding pool** — Either a single table with `source_type` (plan, task, doc, commit) and `source_id`, or a federated query that unions `plan_embeddings`, `task_embeddings`, `documentation_embeddings` (and optionally embedded commit messages).
2. **Result metadata** — Each hit must carry `source_type`, `source_id`, and enough fields to join back (e.g. `plan_id`, `task_id`, `documentation_id`). The embedding tables already have `metadata` JSONB; standardize keys like `{ "source_type": "plan", "plan_id": "..." }`.
3. **Commit embeddings (optional)** — Add `commit_embeddings` table: `commit_link_id`, `content` (message or message+diff summary), `embedding`, `metadata`. Enables "commits about X" semantic search.

### Activity by date (today + extension)

`get_activity_by_date` uses: commits, plan output chunks, tasks updated. **Doc changes** are not included. To include docs:

- Add a view or query that joins `documentation` on `sha` with recent commits (or a separate "docs updated" feed keyed by `documentation.created_at` or commit date from `sha`).
- Or: add `commit_links`-style rows for docs when they land (e.g. `documentation` already has `repo`, `sha` — the link exists implicitly; we just need to surface it in the activity API).

## Suggested metadata fields (existing + proposed)

| Source                     | Existing                       | Proposed / standardized                                                     |
| -------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `plan_embeddings`          | `metadata` JSONB (often empty) | `{ "source_type": "plan", "plan_id": "..." }` for unified search            |
| `task_embeddings`          | `metadata` JSONB (often empty) | `{ "source_type": "task", "task_id": "...", "plan_id": "..." }`             |
| `documentation_embeddings` | `metadata` JSONB               | `{ "source_type": "doc", "documentation_id": "...", "path": "..." }`        |
| `commit_links`             | repo, sha, message             | (Optional) `commit_embeddings` table for semantic search                    |
| `plans` / `tasks`          | author, assignee, project_id   | No change; project_id already links to `projects`                           |
| `documentation`            | repo, sha, path, authors       | Path can imply project (e.g. `projects/apps/foo/README.md` → project `foo`) |

## Summary

- **repo + sha + date** are the universal anchors that tie commits and docs together.
- **commit_links** links plans/tasks to repo+sha.
- **project_id** on plans/tasks links to `projects`; `documentation.path` can infer project for NX READMEs.
- **Unified semantic search** requires: standardized `metadata` in embedding tables, and optionally a `commit_embeddings` table.
- **Activity by date** can be extended to include docs by joining `documentation` on `sha` or surfacing `documentation.created_at` in the activity feed.
