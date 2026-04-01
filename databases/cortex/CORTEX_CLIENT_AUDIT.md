# Cortex client → entity migration audit

Audit for plan: *Replace ds.query in ai-mcp cortex-client with typed entities from cortex/nestjs-repositories* (Plan-Id: 63ab8890-e955-4c87-9897-f46ee3d21494).

## 1. Schema: plans.project and tasks.project

- **DB:** `plans.project` and `tasks.project` exist (migrations `022_add_project_to_plans.sql`, `023_add_project_to_tasks.sql`). Optional TEXT, indexed with partial index when NOT NULL.
- **cortex-client:** Uses `project` for filtering in `listPlansByStatus` (optional param) and in plan/task CRUD (create/update/select). All plan and task row types include `project: string | null`.
- **nestjs-repositories:** `Plan` and `Task` entities do **not** have a `project` column. They match older migrations (002, 003, 012, 014, 015) but not 022/023.
- **Conclusion:** Schema alignment task must add `project` (optional, nullable) to both `Plan` and `Task` entities in `packages/cortex/nestjs-repositories` so that entity types match the DB and cortex-client can use entity/DTO types for results.

## 2. Query usage map (ds.query and runQuery)

`runQuery` in `data-source.ts` is a thin wrapper: it calls `ds.query` and normalizes the result to `{ rows, rowCount }`. So every call site is “raw SQL via DataSource.” Below, “ds.query” = direct `ds.query`; “runQuery” = `runQuery(ds, sql, params)`.

### 2.1 Semantic search (vector; keep raw SQL, type results)

| Function               | Calls   | Tables               | Notes                                      |
|------------------------|---------|----------------------|--------------------------------------------|
| `runSemanticSearch`    | ds.query x2 | plan_embeddings, task_embeddings | pgvector `<=>`; keep raw SQL, type rows with entity/DTO. |
| `getChunkById`         | ds.query x2 | plan_embeddings, task_embeddings | Same; type result as chunk DTO.             |

### 2.2 Read-only list/count (no vector)

| Function                        | Calls    | Tables  | Migration approach                          |
|---------------------------------|----------|---------|---------------------------------------------|
| `listSources`                   | ds.query x1 | plans   | Repository `find()` or typed query; return DTO. |
| `listDistinctAuthorsAndAssignees` | ds.query x1 | plans, tasks | Raw SQL or repository; union of author/assignee. |
| `listDistinctCategories`        | ds.query x1 | plans   | Repository or typed query.                   |
| `listPlanCountsByStatus`       | ds.query x1 | plans   | Repository queryBuilder or raw COUNT.       |
| `listPlansByStatus`            | ds.query x2 | plans   | Count + list with filters (status, assignee, project, title ILIKE), sort, limit/offset. |

### 2.3 Plan CRUD

| Function      | Calls    | Tables | Migration approach                    |
|---------------|----------|--------|----------------------------------------|
| `createPlan`  | runQuery x1 | plans  | Repository `.save()` or typed insert. |
| `getPlanById` | runQuery x1 | plans  | Repository `.findOne()` or typed query. |
| `updatePlan`  | runQuery x1 | plans  | Repository `.update()` / `.save()`.   |
| `deletePlan`  | runQuery x1 | plans  | Repository `.delete()`.                |

### 2.4 Task CRUD

| Function                   | Calls           | Tables     | Migration approach                         |
|----------------------------|-----------------|------------|--------------------------------------------|
| `createTask`               | runQuery x2, ds.query x1 | tasks, plans | Insert task; then SELECT plan status; optionally UPDATE plan status to in_progress. |
| `getTaskById`              | runQuery x1     | tasks      | Repository `.findOne()`.                    |
| `getTasksByPlanId`         | runQuery x1     | tasks      | Repository `.find({ where: { planId } })`.  |
| `getRemainingTasksByPlanId`| runQuery x1     | tasks      | Repository with status IN (remaining).     |
| `updateTask`               | runQuery x1     | tasks      | Repository `.update()` / `.save()`.        |
| `deleteTask`               | runQuery x1     | tasks      | Repository `.delete()`.                    |

### 2.5 Commit links

| Function                 | Calls    | Tables       | Migration approach              |
|--------------------------|----------|--------------|---------------------------------|
| `createCommitLink`       | runQuery x1 | commit_links | Repository `.save()`.           |
| `getCommitLinksByPlanId` | runQuery x1 | commit_links | Repository `.find()`.           |
| `getCommitLinksByTaskId` | runQuery x1 | commit_links | Repository `.find()`.           |

### 2.6 Last activity (plan or task)

| Function                    | Calls     | Tables             | Migration approach                    |
|-----------------------------|-----------|--------------------|---------------------------------------|
| `getLastActivityForPlanOrTask` | runQuery x6 | commit_links (x2), plan_output_stream (x1), tasks (x2) | Combine repository queries; type each result. |

### 2.7 Plan output stream

| Function                | Calls    | Tables             | Migration approach       |
|-------------------------|----------|--------------------|--------------------------|
| `createPlanOutputChunk`  | runQuery x1 | plan_output_stream | Repository `.save()`.   |
| `getPlanOutputByPlanId` | runQuery x1 | plan_output_stream | Repository `.find()`.   |

### 2.8 Activity by date

| Function                          | Calls (each runQuery) | Tables             | Migration approach              |
|-----------------------------------|------------------------|--------------------|---------------------------------|
| `getCommitLinksInDateRange`       | runQuery x1            | commit_links + plans, tasks | Typed query with joins.        |
| `getPlanOutputChunksInDateRange`  | runQuery x1            | plan_output_stream + plans | Typed query with join.         |
| `getTasksUpdatedInDateRange`     | runQuery x1            | tasks + plans      | Typed query with join.         |
| `getActivityByDateRange`         | (calls above 3)        | —                  | No direct queries.              |

### 2.9 Notes

| Function      | Calls    | Tables | Migration approach       |
|---------------|----------|--------|--------------------------|
| `createNote`  | runQuery x1 | notes  | Repository `.save()`.    |
| `getNoteById` | runQuery x1 | notes  | Repository `.findOne()`. |
| `listNotes`   | runQuery x1 | notes  | Repository `.find()`.   |
| `updateNote`  | runQuery x1 | notes  | Repository `.update()`/`.save()`. |
| `deleteNote`  | runQuery x1 | notes  | Repository `.delete()`.  |

### 2.10 Plan and task embeddings (vector)

| Function                | Calls     | Tables           | Notes                                           |
|-------------------------|------------|------------------|-------------------------------------------------|
| `deletePlanEmbeddings`  | runQuery x1 | plan_embeddings  | Keep raw SQL or use repository delete.         |
| `deleteTaskEmbeddings`  | runQuery x1 | task_embeddings  | Same.                                           |
| `insertPlanEmbedding`   | ds.query x1 | plan_embeddings  | pgvector; keep raw SQL, type params/result.    |
| `insertTaskEmbedding`   | ds.query x1 | task_embeddings  | Same.                                           |

## 3. Summary counts

- **Total raw query call sites:** ~45 (ds.query and runQuery combined).
- **By table:** plans (many), tasks (many), plan_embeddings (4), task_embeddings (4), commit_links (5), plan_output_stream (4), notes (5). Activity-by-date uses joins across commit_links, plan_output_stream, tasks, plans.
- **Vector (pgvector):** Semantic search and getChunkById (plan/task_embeddings); insertPlanEmbedding / insertTaskEmbedding. Keep raw SQL for `<=>` and `::vector`; use entity/DTO types for row shapes.
- **Entity alignment:** Add `project` to Plan and Task in nestjs-repositories so that list/count/CRUD can use repository or typed queries with the same row shape as cortex-client.

## 4. Dependencies and integration

- **ai-mcp** uses `getOrCreateDataSource(config)` from `data-source.ts` (TypeORM DataSource, no entities registered). cortex-client does not depend on `@packages/cortex/nestjs-repositories` today.
- **Integration options** (for “Decide integration approach” task):
  - **Shared DataSource + entity types:** ai-mcp creates DataSource with entities from nestjs-repositories; cortex-client uses same DataSource and repository services or typed QueryBuilder.
  - **Thin cortex-data package:** Shared types + optional small data layer used by both ai-mcp and Nest; repositories stay in Nest.
  - **Type-only imports:** ai-mcp keeps raw SQL but imports Plan, Task, etc. as types only for mapping rows to DTOs; no runtime dependency on Nest or repository services.
