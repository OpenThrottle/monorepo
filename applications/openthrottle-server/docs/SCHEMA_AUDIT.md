# Cortex API GraphQL schema audit

Gap analysis: cortex app data needs vs cortex-api GraphQL (and REST) as of this audit.

## App data sources

- **cortex-server** (`@openthrottle/ai-mcp/src/cortex-server`): direct Cortex Postgres used in route loaders/actions for plans, tasks, notes, activity, commit links, semantic search, plan counts, categories, assignees.
- **cortex-api**: NestJS app; REST used today for GitHub pulls and generators; GraphQL to be the single API for the cortex app.

## App needs (from cortex app routes)

| Need                                            | cortex-server usage                                                                               | cortex-api GraphQL (before audit) | cortex-api REST                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| **Plans**                                       |                                                                                                   |                                   |                                               |
| Get plan by ID                                  | `getPlanById`                                                                                     | `plan(id)` ✅                     | -                                             |
| List plans (filtered, sorted, paginated)        | `listPlansByStatus` (status, assignee, project, sortBy, sortOrder, titleSubstring, limit, offset) | `plans()` only ❌                 | -                                             |
| Plan counts by status                           | `listPlanCountsByStatus`                                                                          | ❌                                | -                                             |
| Distinct categories                             | `listDistinctCategories`                                                                          | ❌                                | -                                             |
| Distinct authors/assignees                      | `listDistinctAuthorsAndAssignees`                                                                 | ❌                                | -                                             |
| Create / update / delete plan                   | `createPlan`, `updatePlan`, `deletePlan`                                                          | ❌                                | -                                             |
| **Tasks**                                       |                                                                                                   |                                   |                                               |
| Get task by ID                                  | `getTaskById`                                                                                     | `task(id)` ✅                     | -                                             |
| List tasks by plan                              | `getTasksByPlanId`                                                                                | `tasksByPlanId(planId)` ✅        | -                                             |
| Remaining tasks (pending, in_progress, blocked) | `getRemainingTasksByPlanId`                                                                       | ❌                                | -                                             |
| Create / update / delete task                   | `createTask`, `updateTask`, `deleteTask`                                                          | ❌                                | -                                             |
| **Notes**                                       |                                                                                                   |                                   |                                               |
| Get note by ID                                  | `getNoteById`                                                                                     | `note(id)` ✅                     | -                                             |
| List notes                                      | `listNotes`                                                                                       | `notes()` ✅                      | -                                             |
| Create / update / delete note                   | `createNote`, `updateNote`, `deleteNote`                                                          | ❌                                | -                                             |
| **Activity**                                    |                                                                                                   |                                   |                                               |
| Activity by date range                          | `getActivityByDateRange(startIso, endIso)`                                                        | ❌                                | -                                             |
| **Commit links**                                |                                                                                                   |                                   |                                               |
| By plan ID                                      | `getCommitLinksByPlanId`                                                                          | `commitLinksByPlanId(planId)` ✅  | -                                             |
| By task ID                                      | `getCommitLinksByTaskId`                                                                          | `commitLinksByTaskId(taskId)` ✅  | -                                             |
| **Semantic search**                             | `searchPlansBySemanticQuery(query, limit)`                                                        | `searchPlans(query, limit)` ✅    | -                                             |
| **GitHub pulls**                                | -                                                                                                 | ❌                                | `GET /github/repos/:owner/:repo/pulls` ✅     |
| **Generators**                                  | -                                                                                                 | ❌                                | `GET /generators`, `GET /generators/:name` ✅ |
| **Settings**                                    | -                                                                                                 | -                                 | App has settings routes; no backend yet       |

## Additions made in this audit

- **Plans**: `listPlansByStatus`, `listPlanCountsByStatus`, `listDistinctCategories`, `listDistinctAuthorsAndAssignees`; mutations `createPlan`, `updatePlan`, `deletePlan`.
- **Tasks**: `remainingTasksByPlanId`; mutations `createTask`, `updateTask`, `deleteTask`.
- **Notes**: mutations `createNote`, `updateNote`, `deleteNote`.
- **Activity**: new query `activityByDateRange(startIso, endIso)` with types for commits, output chunks, tasks updated.
- **GitHub**: GraphQL query `pulls(owner, repo, state, base?, merged?)` (wraps existing REST).
- **Generators**: GraphQL queries `generators`, `generator(name)` (wrap existing REST).

## Deferred / follow-up

- **(Done)** **searchPlans (semantic)**: Implemented via `searchPlans(query, limit)`; uses `@openthrottle/ai-mcp` cortex-server (embedding via OPENAI_API_KEY or Ollama).

## Field deprecation policy

Do not remove or change types on existing GraphQL fields without a migration plan. Mark unused fields with NestJS `deprecationReason` instead:

- **Object fields:** `@Field(() => String, { deprecationReason: 'Use newField instead.' })`
- **Queries / mutations:** `@Query(() => String, { deprecationReason: '...' })` (same for `@Mutation`, `@ResolveField`, `@Args`)

**Example in this repo:** `ServerHealthObject.apiStatus` is deprecated in favor of `api` (see `server-health.object.ts` and the generated `@deprecated` directive in `schema.gql`).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#graphql-schema-and-codegen) and the PR template **GraphQL schema** checklist.
