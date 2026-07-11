# GraphQL coverage audit: ai-mcp → openthrottle-mcp

Audit of operations needed for notes, plans, projects, tasks, commit, activity, output, search, and health so openthrottle-mcp can achieve parity with ai-mcp over GraphQL only (no direct OpenThrottle Postgres).

## Summary

| Area         | ai-mcp tools / resource                                                                                                                   | Server GraphQL (openthrottle-server)                                                                     | openthrottle-mcp .graphql (after this audit)                                                                               | Gaps / notes                                                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Notes**    | create_note, get_note, list_notes, update_note, delete_note                                                                               | note(id), notes(), createNote, updateNote, deleteNote(id)                                                | All added                                                                                                                  | Server `notes()` has no author/limit args; list_notes can use notes() and filter client-side or server can add optional args later.                                                                              |
| **Plans**    | list_plans_by_status, create_plan, get_plan, update_plan, delete_plan                                                                     | plan(id), listPlansByStatus(input), createPlan, updatePlan, deletePlan(input)                            | All added                                                                                                                  | None.                                                                                                                                                                                                            |
| **Projects** | — (ai-mcp has no OpenThrottle project row CRUD tools; plans/tasks carry optional `project` / `projectId`)                                 | project(id), projects, createProject, updateProject, deleteProject(input)                                | createProject, deleteProject in mutations.graphql; getProject, getProjects in queries.graphql; **delete_project** MCP tool | MCP exposes **delete_project** only. Create/update/list projects: use GraphQL (e.g. Playground, scripts) or add tools later. Deleting a project clears `project_id` on related plans/tasks (ON DELETE SET NULL). |
| **Tasks**    | create_task, create_tasks, get_task, get_tasks_by_plan_id, get_remaining_tasks_for_plan, list_tasks_by_category, update_task, delete_task | task(id), tasksByPlanId(input), remainingTasksByPlanId(input), createTask, updateTask, deleteTask(input) | All that exist on server added                                                                                             | **list_tasks_by_category**: not in server. Implement via new query or document for later. **create_tasks** (batch): server has createTask only; MCP can loop or server can add createTasks mutation.             |
| **Commit**   | link_commit                                                                                                                               | commitLinksByPlanId(input), commitLinksByTaskId(input), commitLink(input)                                | Queries added                                                                                                              | **link_commit**: no create mutation on server. `LinkCommitInput` exists in commit-link.input.ts but no resolver mutation. Add `linkCommit` mutation on server (task f8c64301).                                   |
| **Activity** | get_activity_by_date, get_last_activity                                                                                                   | activityByDate(input), activityByDateRange(input), lastActivity(input)                                   | activityByDate, activityByDateRange, getLastActivity; tools implemented                                                    | lastActivity(planId, taskId?) added to server; openthrottle-mcp has get_activity_by_date and get_last_activity via GraphQL only.                                                                                 |
| **Output**   | append_plan_output, get_plan_output                                                                                                       | appendPlanOutput(input), planOutputStreamChunks(input)                                                   | Both added                                                                                                                 | None.                                                                                                                                                                                                            |
| **Search**   | semantic_search, get_document, list_sources                                                                                               | search(input), getDocument(id), listSources                                                              | search, getDocument, listSources added                                                                                     | None. getDocument and listSources added to server; openthrottle-mcp tools and knowledge-base resource implemented.                                                                                               |
| **Health**   | health (server + optional OpenThrottle DB)                                                                                                | serverHealth → { api, database, redis, websocket }                                                       | getServerHealth already present                                                                                            | MCP health can use serverHealth only (no direct DB from MCP).                                                                                                                                                    |

## Operations added in openthrottle-mcp (this audit)

### Queries (queries.graphql)

- **Notes**: getNote, getNotes (already present).
- **Plans**: plan, listPlansByStatus.
- **Projects**: getProject (`project(id)`), getProjects (`projects`) — used for codegen; no dedicated list/get MCP tools yet.
- **Tasks**: task, tasksByPlanId, remainingTasksByPlanId.
- **Commit**: commitLinksByPlanId (for get_plan payload).
- **Activity**: activityByDate, activityByDateRange, getLastActivity (lastActivity).
- **Output**: planOutputStreamChunks.
- **Search**: search, getDocument, listSources.
- **Health**: getServerHealth (already present).

### Mutations (mutations.graphql)

- **Notes**: createNote, updateNote, deleteNote (already present).
- **Plans**: createPlan, updatePlan, deletePlan.
- **Projects**: createProject, deleteProject (MCP tool **delete_project** maps to `deleteProject`).
- **Tasks**: createTask, updateTask, deleteTask.
- **Output**: appendPlanOutput.

### Not added (server gaps)

- **linkCommit** – add mutation on openthrottle-server (CommitLinksResolver) and add to mutations.graphql when available.
- **lastActivity(planId, taskId?)** – added to server and getLastActivity in queries.graphql; activity tools (get_activity_by_date, get_last_activity) implemented in openthrottle-mcp.
- **getDocument(chunkId)** – added to server (SearchResolver.getDocument), queries.graphql (getDocument), and openthrottle-mcp tools + knowledge-base resource.
- **listSources** – added to server (SearchResolver.listSources), queries.graphql (listSources), and openthrottle-mcp list_sources tool.
- **list_tasks_by_category** – add query on server (tasks resolver) and to queries.graphql when available; or implement MCP tool by filtering tasksByPlanId/remainingTasksByPlanId client-side.
- **create_tasks** (batch) – optional: add createTasks mutation on server or keep MCP calling createTask in a loop.

## Codegen

After editing `.graphql` files, run:

```bash
pnpm nx run @openthrottle/openthrottle-mcp:codegen-graphql
```

Or from repo root with API_URL set:

```bash
API_URL=http://localhost:6010/graphql pnpm nx run @openthrottle/openthrottle-mcp:codegen-graphql
```

This regenerates `src/__generated__/graphql.js` and `src/__generated__/schemas.ts` (types and Zod schemas) from the schema and the .graphql documents.

## Manual smoke test: `delete_project`

Use this to confirm the MCP tool and server mutation against a running API (no automated smoke binary in-repo).

1. **Server and DB:** Run openthrottle-server with OpenThrottle Postgres available (same setup as local development; GraphQL URL is often `http://localhost:6010/graphql` — align with your `API_URL` for codegen).
2. **Auth:** Set `OPENTHROTTLE_MCP_AUTH_TOKEN` to a valid JWT or API token (see [AUTH.md](./AUTH.md)).
3. **Create a disposable project:** In GraphQL Playground or `curl`, call `createProject` with a unique `name` (and optional `nxProjectName`). Note the returned `id`.
4. **Invoke the tool:** Call MCP tool `delete_project` with input `{ "id": "<uuid>" }` (e.g. from Cursor MCP or an MCP client connected to `pnpm nx run @openthrottle/openthrottle-mcp:serve`).
5. **Expect:** Structured content `{ "deleted": true }` and assistant text indicating the project was deleted. Call again with the same `id`: `{ "deleted": false }` and a not-found style message.
6. **Optional:** Create a plan or task linked to that `projectId`, delete the project, then fetch the plan/task and confirm `projectId` is null while rows remain.
