# openthrottle-developer Vitest failure baseline

Captured **2026-05-16** for plan `66fcc765-769f-4927-a856-c12adcd70c0e` (task `d05b4341-9b5b-4085-9681-30b02e940b77`).

Command: `pnpm nx run openthrottle-developer:test`

## Summary

| Metric             | Count |
| ------------------ | ----: |
| Test files failed  |    22 |
| Tests failed       |    59 |
| Tests passed       |   785 |
| Tests skipped      |    13 |
| Test files passed  |   230 |
| Test files skipped |    13 |

Duration ~86–89s (full suite).

## Failing files (59 tests)

| File                                                                       | Failed | Passed | Notes                                        |
| -------------------------------------------------------------------------- | -----: | -----: | -------------------------------------------- |
| `app/routing/plans/components/__tests__/PlanTasksTable.test.tsx`           |     17 |      1 | Table columns, links, Details popover        |
| `app/routing/plans/components/__tests__/PlansTable.test.tsx`               |      6 |      0 | Empty shell, headers, status filter links    |
| `app/routing/plans/components/__tests__/PlanTasksBoard.test.tsx`           |      7 |      1 | DnD live region, board group, status columns |
| `app/routes/__tests__/plans.$planId._index.test.tsx`                       |      4 |      1 | Plan detail, empty state, Tasks tab URL      |
| `app/routes/__tests__/projects.$projectId.test.tsx`                        |      3 |      4 | Detail header, nx badge, not-found           |
| `app/routing/projects/components/__tests__/ProjectsTable.test.tsx`         |      3 |      2 | Column headers, row data                     |
| `app/routing/plans/components/__tests__/PlanWorkflowConfigPrompt.test.tsx` |      1 |      3 | Layer 1 fieldset accessible name             |
| `app/routing/plans/components/__tests__/PlanWorkflowConfigTuning.test.tsx` |      1 |      2 | Layer 3 fieldset accessible name             |
| `app/routing/dashboard/components/__tests__/DashboardQueueStats.test.tsx`  |      2 |      1 | Queue list, delayed count                    |
| `app/routes/__tests__/plans._index.test.tsx`                               |      2 |      0 | Stat cards, `role="main"`                    |
| `app/routes/__tests__/projects._index.test.tsx`                            |      2 |      0 | Table view, empty state                      |
| `app/routes/__tests__/search._index.test.tsx`                              |      1 |      3 | Missing `role="main"`                        |
| `app/routes/__tests__/settings.debug.test.tsx`                             |      1 |      1 | Diagnostics copy drift                       |
| `app/routing/projects/components/__tests__/ProjectsToolbar.test.tsx`       |      1 |      3 | Create project link role/name                |
| `app/routing/dashboard/components/__tests__/DashboardToolbar.test.tsx`     |      1 |      0 | Toolbar heading accessible name              |
| `app/routing/plans/utils/__tests__/parsers.test.ts`                        |      1 |      8 | Tab search param constant                    |
| `app/routes/__tests__/notifications._index.test.tsx`                       |      1 |      0 | Placeholder stub                             |
| `app/routes/__tests__/settings._index.test.tsx`                            |      1 |      0 | Placeholder stub                             |
| `app/routes/__tests__/settings.application.test.tsx`                       |      1 |      0 | Placeholder stub                             |
| `app/routes/__tests__/settings.cusomization.test.tsx`                      |      1 |      0 | Placeholder stub                             |
| `app/routes/__tests__/skill._index.test.tsx`                               |      1 |      0 | Placeholder stub                             |

## Recurring failure modes

### 1. Component markup drift vs table/board specs (~31 tests)

**PlansTable** (`PlansTable.tsx`):

- Empty `plans` short-circuits to `PlanTasksEmpty` — tests expect `data-testid="PlansTable"` and column headers when `plans: []`.
- Large parts of `PlansTable.buildTable` are commented out (status column, filter links with `aria-label` like `Filter by In Progress`). Tests still query `columnheader` / status filter links.
- Rendered layout is title-centric (heading + metadata links), not the old multi-column table.

**PlanTasksTable / PlanTasksBoard / ProjectsTable**: Same class of failures — `Unable to find` for `columnheader`, filter links, `No results.`, board `group` names, DnD `aria-live` region. Specs assume prior table/board ARIA structure.

**Representative errors:**

- `Unable to find an element by: [data-testid="PlansTable"]`
- `Unable to find an accessible element with the role "columnheader" and name "Status"`
- `Unable to find an accessible element with the role "link" and name "Filter by In Progress"`

**Fix strategy:** Update specs to match current components (preferred per plan), or restore commented columns/labels if product still requires them.

### 2. Accessible name / fieldset label drift (~5 tests)

Workflow config and dashboard toolbar tests query named groups/headings that no longer match:

- `role="group"` + name `Layer 1 — Prompt profile` (fieldset name empty in DOM)
- `role="group"` + name `Layer 3 — …` (tuning)
- `role="heading"` + name `DashboardToolbar`

**Fix strategy:** Align `aria-labelledby` / `<legend>` / heading text in components or relax queries to current labels.

### 3. Route integration: missing `role="main"` (~5 tests)

`plans._index`, `projects._index`, `search._index` tests expect `getByRole('main')`. Rendered route trees expose `heading`, `paragraph`, etc., but no `main` landmark.

**Fix strategy:** Add `<main>` to route layouts (product a11y win) or update route tests to query stable `data-testid`/headings.

### 4. Route loader / render harness mismatch (~9 tests)

`plans.$planId._index`, `projects.$projectId`, `projects._index` — failures on detail copy, badges, empty states. Often `createRoutesStub` without full loader context or outdated loader fixture shape vs route component.

**Fix strategy:** Use `renderRouteHarness` / shared fixtures; align mock loader data with current GraphQL fragments.

### 5. Placeholder route smoke tests (`expect(true).toStrictEqual(false)`) — 6 tests

These files contain commented-out real tests and a failing placeholder:

- `settings._index.test.tsx`
- `settings.application.test.tsx`
- `settings.cusomization.test.tsx`
- `notifications._index.test.tsx`
- `skill._index.test.tsx`
- (`profile._index.test.tsx` is **skipped**, not failed)

**Fix strategy:** Implement render tests using `renderRouteHarness` + loader fixtures (see `route-fixtures.tsx`, `search-route-fixtures.ts`).

### 6. Copy / constant drift (~4 tests)

| Area                      | Test expectation                                     | Actual                                             |
| ------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| `parsers.test.ts`         | `PLANS_DETAIL_TAB_SEARCH_PARAM === 'plansDetailTab'` | `'tab'` in `parsers.ts`                            |
| `settings.debug.test.tsx` | Text `/localStorage & sessionStorage/i`              | Section removed or renamed in `SettingsDebugPanel` |
| `ProjectsToolbar`         | `link` name `/create project/i`                      | Link absent or different accessible name           |
| `search._index`           | Pagination text `Showing 1-1 of 1 results`           | May have changed with layout                       |

**Fix strategy:** Update spec to match intentional product change, or revert constant/copy if rename was accidental.

### 7. Dashboard queue stats (~2 tests)

`DashboardQueueStats` — queue list and delayed count assertions do not match current markup/copy.

## Suggested fix order (maps to plan tasks)

1. **Plans table/board** — `PlansTable`, `PlanTasksTable`, `PlanTasksBoard` (~30 failures).
2. **Workflow + parsers** — `PlanWorkflowConfigPrompt`, `PlanWorkflowConfigTuning`, `parsers.test.ts`.
3. **Plans routes** — `plans._index`, `plans.$planId._index`.
4. **Projects** — `ProjectsTable`, `ProjectsToolbar`, `projects._index`, `projects.$projectId`.
5. **Dashboard** — `DashboardToolbar`, `DashboardQueueStats`.
6. **Settings / search / notifications / skill** — stub routes + `settings.debug` + `search._index`.
7. **Verify** — full `pnpm nx run openthrottle-developer:test`; document 13 intentional skips under `app/routes/__tests__/` (`it.skip` / todo routes).

## Intentional skips (not failures)

13 route tests skipped (e.g. `_index`, `auth._index`, `generators.*`, `notes.*`, `profile._index`, `prompts._index`, `pull-requests.*`, `queues._index`, `projects.create`). Treat as deferred coverage, not regressions.

## Quick repro (single file)

```bash
cd applications/openthrottle-developer
npx vitest run app/routing/plans/components/__tests__/PlansTable.test.tsx
npx vitest run app/routes/__tests__/settings._index.test.tsx
npx vitest run app/routing/plans/utils/__tests__/parsers.test.ts -t "search param key"
```
