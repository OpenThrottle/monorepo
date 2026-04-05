# OpenThrottle index audit

Maps ai-mcp and OpenThrottle app query patterns to existing indexes and identifies gaps. Used to add migrations (see `migrations/`) and the Indexes subsection in README.

## Query patterns (source: ai-mcp cortex-client, OpenThrottle app)

| Query / feature              | Table(s)                         | Filter / sort                                                                                  | Used by                                   |
| ---------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| listPlansByStatus            | plans                            | status, assignee (author OR assignee), title ILIKE; ORDER BY created_at or updated_at ASC/DESC | MCP list_plans_by_status, OpenThrottle UI |
| get_tasks_by_plan_id         | tasks                            | plan_id; ORDER BY created_at                                                                   | MCP get_tasks_by_plan_id                  |
| get_remaining_tasks_for_plan | tasks                            | plan_id, status IN (...); ORDER BY created_at                                                  | MCP get_remaining_tasks_for_plan          |
| list_tasks_by_category       | tasks                            | category (required); optional status, plan_id; ORDER BY created_at; optional limit             | MCP list_tasks_by_category                |
| commit_links by plan         | commit_links                     | plan_id; ORDER BY created_at DESC (e.g. last activity)                                         | link_commit, get_last_activity            |
| commit_links by task         | commit_links                     | task_id; ORDER BY created_at DESC LIMIT 1                                                      | get_last_activity                         |
| plan_output_stream           | plan_output_stream               | plan_id; ORDER BY created_at ASC/DESC                                                          | append_plan_output, get_plan_output       |
| notes list                   | notes                            | optional author; ORDER BY created_at DESC                                                      | MCP list_notes                            |
| semantic_search              | plan_embeddings, task_embeddings | ORDER BY embedding <=> $1 (cosine)                                                             | MCP semantic_search                       |
| get_document                 | plan_embeddings, task_embeddings | id (PK)                                                                                        | MCP get_document                          |

## Existing indexes (from migrations 002–016)

- **plans:** idx_plans_status, idx_plans_category, idx_plans_author, idx_plans_created_at (created_at DESC), idx_plans_assignee (partial WHERE assignee IS NOT NULL).
- **tasks:** idx_tasks_plan_id, idx_tasks_status, idx_tasks_category, idx_tasks_created_at (created_at DESC), idx_tasks_requirements (GIN), idx_tasks_assignee (partial).
- **plan_embeddings:** idx_plan_embeddings_plan_id, idx_plan_embeddings_vector (hnsw cosine), idx_plan_embeddings_metadata (GIN).
- **task_embeddings:** idx_task_embeddings_task_id, idx_task_embeddings_vector (hnsw cosine), idx_task_embeddings_metadata (GIN).
- **commit_links:** idx_commit_links_plan_id, idx_commit_links_task_id (partial WHERE task_id IS NOT NULL), idx_commit_links_repo_sha, unique (plan_id, COALESCE(task_id, zero-uuid), repo, sha).
- **plan_output_stream:** idx_plan_output_stream_plan_id, idx_plan_output_stream_created_at (plan_id, created_at).
- **notes:** idx_notes_author, idx_notes_created_at (created_at DESC).

## Gaps

1. **plans.updated_at** – listPlansByStatus can sort by `updated_at`; there is no index on `updated_at`. Add index on plans(updated_at) for ORDER BY updated_at.
2. **plans: composite filter+sort** – Common pattern is filter by status (and optionally assignee) then sort by created_at or updated_at. Single-column indexes (status, created_at, updated_at) help but composite indexes (e.g. status + created_at DESC, status + updated_at DESC, assignee + created_at) can avoid extra sort steps. Add if query plans show benefit; start with updated_at.
3. **plans.title ILIKE** – listPlansByStatus supports title substring filter via `title ILIKE $1`. No trigram index; at current scale full table scan may be acceptable. Option A: add pg_trgm extension and GIN index on plans(title). Option B: document that full scan is acceptable at current scale.
4. **commit_links** – Queries “last by plan_id” / “last by task_id” use ORDER BY created_at DESC. Existing idx_commit_links_plan_id and idx_commit_links_task_id support WHERE; composite (plan_id, created_at DESC) and (task_id, created_at DESC) would support ORDER BY without separate sort. Lower priority than plans.updated_at.
5. **tasks** – get_tasks_by_plan_id uses (plan_id, ORDER BY created_at). idx_tasks_plan_id exists; composite (plan_id, created_at) would allow index order. get_remaining_tasks_for_plan filters by plan_id and status; (plan_id, status, created_at) could help. Lower priority than plans.

## Priority for migrations

1. Add index on plans(updated_at) for listPlansByStatus sort.
2. Optionally add composite indexes on plans (status, created_at DESC), (status, updated_at DESC) after measuring.
3. Title ILIKE: either add pg_trgm + GIN on plans(title) or document in README that full scan is acceptable at current scale.
4. Document all indexes and when to add new ones in README (see task “Document OpenThrottle index strategy in README”).
