# Story over time: surfacing ideas

Sketch of how the "story over time" could be surfaced in UI or APIs. Builds on [metadata-model-minimal.md](./metadata-model-minimal.md). Keep vague; refine later.

## Current state

| Surface                 | What exists                                                                          | Source                                |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| **activityByDate**      | GraphQL query — commits, plan output chunks, tasks updated for a date or last N days | openthrottle-mcp, openthrottle-server |
| **activityByDateRange** | Same, for an ISO date range                                                          | openthrottle-server                   |
| **Dashboard**           | Recent activity card (commits, output chunks, tasks)                                 | Cortex app, openthrottle-developer    |
| **Semantic search**     | Plans + tasks + docs, all via openthrottle-mcp (`semantic_search`, `get_document`)   | One MCP; cross-source ranking is a gap |

---

## Timeline view (idea)

- **Concept:** A single scrollable timeline showing commits, plan output, task updates, and (future) doc changes in chronological order.
- **Data:** Already have `activityByDate` / `activityByDateRange` returning commits, outputChunks, tasksUpdated. Each has `createdAt` for ordering.
- **Gap:** Docs not in activity. Extend activity query to include `documentation` rows that share `sha` with commits in range, or key by `documentation.created_at`.
- **UI:** Group by date (day/week); group by plan; filter by project. Could be a new dashboard tab or a dedicated "Timeline" route.

---

## Activity by date (extended)

- **Today:** `get_activity_by_date` (openthrottle-mcp) and `activityByDate` GraphQL return commits, output chunks, tasks updated. Pagination via limit/offset.
- **Extension:** Add a fourth bucket — `docsUpdated` or `docsLanded` — by joining `documentation` on `sha` with commits in range, or by adding docs to the activity result when they land (e.g. docs-watch workflow could insert activity rows).
- **Fallback:** If we don't want to extend the activity query, a separate `docsByDate` or `docsBySha` query could let the client merge timelines.

---

## Semantic search across plans / docs / commits

- **Concept:** One query that returns hits from plans, tasks, docs, and (optionally) commits — e.g. "everything about OAuth" or "auth-related work".
- **Today:** openthrottle-mcp serves plans, tasks, and docs (`semantic_search`, `list_sources`, `get_document`). (The former standalone `docs-mcp` server is retired — see [mcp-registration.md § Current state](./mcp-registration.md#current-state).) Cross-source ranking in a single call is not yet unified.
- **Options:**
  1. **Federated:** New MCP tool or GraphQL query that calls both, merges results, dedupes by relevance. Client sees one result set.
  2. **Unified table:** Single embedding table with `source_type` + `source_id` (see metadata-model-minimal). One query; simpler but requires migration/ingest changes.
  3. **Commit embeddings:** Add `commit_embeddings` to include commit messages in semantic search ("commits about X").

---

## Surfaces (candidates)

| Surface                | Description                                                                                                       | Effort      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| **Dashboard timeline** | Extend existing activity card into a fuller timeline (group by date, expand/collapse).                            | Low         |
| **Plan detail**        | Per-plan timeline: commits, output, tasks for that plan. Partially exists (plan output, tasks); add commit links. | Low         |
| **Project view**       | Filter timeline by `project_id`; show plans/tasks/docs for a project.                                             | Medium      |
| **Unified search**     | Search bar that queries plans + tasks + docs (+ commits).                                                         | Medium–high |
| **Docs in activity**   | Add docs to `activityByDate` when they share `sha` with a commit.                                                 | Low–medium  |

---

## Summary

- **Timeline:** Use existing activity data; optionally add docs; improve UI grouping/filtering.
- **Activity API:** Extend to include docs (join on sha or separate docs-by-date).
- **Semantic search:** Unify cross-source ranking within openthrottle-mcp (plans + tasks + docs), or unify embedding storage; optionally add commit embeddings.
- **Surfaces:** Dashboard, plan detail, project view, unified search — in that order of complexity.
