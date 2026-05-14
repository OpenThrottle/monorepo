# Document upload: mapping CIR → Plan, Tasks, Requirements

This document defines **deterministic mapping rules** from the **canonical intermediate representation (CIR)** (see `document-upload-requirements.md`) into a **proposal** shaped like existing GraphQL inputs: `CreatePlanInput` plus `CreateTaskInput[]` with `requirements` as a **JSON string** encoding a `string[]`. No database writes occur at this stage; the ingest API or UI commits after user confirmation.

## Goals and non-goals

- **Goals:** Predictable output for the same CIR; testable pure functions; alignment with `PlanCreationService` (author, category, assignee normalization on persist, not necessarily in the proposal preview).
- **Non-goals (v1):** Using an LLM to infer structure. Optional LLM assist is specified only as a **future extension** behind an explicit flag and validation pass.

## Inputs to the mapper

| Input                         | Role                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CIR**                       | `meta`, `sections`, optional `artifacts`, `diagnostics` as defined in the requirements doc.                                                                                    |
| **Upload context**            | Authenticated **author** (GitHub login), optional **default category**, **project** / `projectId`, optional **assignee** override, original **filename** (for title fallback). |
| **Options** (optional config) | Max tasks, max requirements per task, max requirement string length (defaults match structure caps in the requirements doc).                                                   |

The mapper **must not** invent `author` or `category`; they come from context or caller-supplied proposal fields. If the API requires `category` and none is provided, return a **validation error** before any preview (do not silently default to a magic string in v1 unless product explicitly adds a server default later).

## Output: proposal object

- **`plan`:** `CreatePlanInput` — all fields the ingest flow intends to set after confirmation. `title` and `category` are required for a valid proposal. `author` should match the session user (or explicit service rule); `assignee` may be null or a valid GitHub login (normalized at create time by `PlanCreationService`).
- **`tasks`:** `CreateTaskInput[]` — each item has `title` required; `planId` is a **placeholder** in memory (e.g. empty string or omitted in an internal DTO) until the server creates the plan, then the same order is used to set real `planId`s before calling existing `create_task` semantics.
- **`mapperDiagnostics`:** append-only list (same shape as CIR `diagnostics` or a dedicated code namespace `mapper.*`) for dropped sections, truncated requirements, merged tasks, etc.

## Plan-level mapping

### Title (`plan.title`)

Apply the first rule that succeeds:

1. **Markdown-style primary heading:** If any section with `parentId === null` has a non-empty `title`, use the **first such section’s** `title` in document order (pre-order traversal by section `id` order as produced by the extractor).
2. **Filename stem:** Else if `meta.filename` has a known extension (`.md`, `.markdown`, `.xlsx`, `.csv`, `.html`, `.htm`, `.json`), use the basename **without** the extension, normalized (replace `_` with space, collapse whitespace, trim). Reject empty result after normalization.
3. **Explicit JSON field:** If CIR `meta.format === 'json'` and the root parse produced a string field `planTitle` or `title` at the document root object (case-sensitive keys only for v1), use that string trimmed.
4. **Fallback:** `"Imported plan"` and add `mapperDiagnostics` with code `mapper.plan_title_fallback` and message referencing `meta.filename`.

### Description and summary (`plan.description`, `plan.summary`)

- **`description`:** Concatenate **plan-level prose** in document order: for every **root** section (`parentId === null`), if `body` is non-empty after trim, include a block separated by a double newline. **Exclude** bodies of sections that become **tasks** (see task boundaries) unless those sections are explicitly marked as “plan-only” by the extractor (v1: no such mark — then **do not** duplicate task body into the plan description).
- **Plan-only content:** If the extractor places introductory text only in the first root section and subsequent roots are tasks, put **only** the first root’s `body` into `description` when that first root is not emitted as a task (see “Single root with children” below).
- **`summary`:** Optional. If the total `description` length exceeds **4 KiB**, set `summary` to the first **~500 Unicode code points** of `description` with an ellipsis, and trim `description` to **8 KiB** with a trailing `…` and a `mapperDiagnostics` entry `mapper.description_truncated`. If under limits, leave `summary` null unless the product sets it from UI.

### Status (`plan.status`)

Default **`PENDING`** in the proposal unless the upload flow passes an explicit status. Uppercase on persist is already handled by `PlanCreationService`.

## Task boundaries

A **task candidate** is a CIR **section** that will yield at most one `CreateTaskInput`. Rules are evaluated **per format** using `meta.format`, then unified.

### Markdown (`md`)

- Each **`##` / second-level heading** from the extractor becomes its own section with a `title` and nested content: **one task per `##` section** (the extractor should emit one section per `##` block).
- A leading `#` / first-level block: if the extractor maps `#` to a root section **without** treating it as a task, that root supplies the **plan title** only; its body follows plan description rules. If the document has **only** `#` and no `##`, emit **one task** titled `"Main"` (or the `#` title if the extractor duplicated it as a task section — prefer **one** task with that title and body under `#`).
- **List items and checklists** under a `##` section belong to that task (`checklistItems`).

### Excel (`xlsx`)

- **One sheet → one task** when the sheet has a name; task `title` = trimmed sheet name. If the workbook has a single unnamed or default sheet, **one task** titled `"Workbook"`.
- If a sheet is represented as multiple sections (e.g. blocks separated by blank rows), the **extractor** should merge into one section per sheet before mapping; the mapper **does not** split sheets.

### CSV (`csv`)

- **One task** titled from filename stem (same as plan title fallback #2) or `"CSV import"`. All rows map to **requirements** (see tables below) unless the extractor promoted headers to a table with semantic role `requirements` only.

### HTML (`html`)

- **One task per `<h2>`**-bounded region if the extractor uses that convention; else **one task** `"Page"` with body from main content extraction. Align with extractor contract: mapper follows section boundaries produced by HTML extractor.

### JSON (`json`)

- **Array of objects** at root with `title` or `name` + optional `requirements` / `tasks`: each element → one task (see structured JSON profile below).
- **Object** at root: if it contains `tasks: [...]`, map each array element to a task; plan title from `planTitle` / `title` / filename per plan rules.
- Otherwise **single task** `"JSON import"` holding stringified subtree in `description` is discouraged; prefer extractor to normalize to sections first.

### Parent/child sections (all formats)

- If a section has **children** and **non-empty `title`**, emit **one task for that section**; map **child sections** to **requirements** (as subsection bullets) or **nested requirements** strings (`"Parent › Child: …"`) when children have bodies but no checklist — choose **one** strategy per build and document it in tests:
  - **v1 recommendation:** Child with `title` + short `body` → requirement string `"<child title>: <first line of body>"`. Child with only `checklistItems` → append those items as requirements. **Do not** create separate tasks for children unless `meta.format === 'md'` and child came from a `###` heading (optional v1.1); for v1, **flatten children into requirements** of the parent task to avoid exploding task count.

## Requirements (`task.requirements`)

Stored as **`JSON.stringify(string[])`** matching `CreateTaskInput.requirements`.

### Sources (in order of precedence for deduplication)

1. **`checklistItems`** on the task’s section (trim, drop empty).
2. **Table rows:** For each `tables[]` on the section, if `headers` suggest acceptance criteria (`acceptance`, `criteria`, `requirement`, `must`), map **each data row** to one requirement by joining non-empty cells with `—` (em dash surrounded by spaces for readability). If headers are generic (`col1`, `col2`), join all cells in the row.
3. **`body` lines** that match **bullet pattern** (`^[-*]\s+` or `^\d+\.\s+`) after the extractor leaves them in `body`: each line becomes one requirement (strip marker).
4. **Deduplication:** Case-fold keys for comparison; preserve first occurrence order. Max **50** strings per task; overflow → `mapperDiagnostics` `mapper.requirements_capped`.
5. **Length:** Each string trimmed to **8 KiB** max Unicode scalar length; truncate with `…` and `mapper.requirements_string_truncated`.

### Empty requirements

- If a task would have **no** title after trim, **skip** the task and `mapperDiagnostics` `mapper.task_skipped_no_title`.
- If a task has a title but **no** requirements and **no** body, still emit the task (requirements `null` or `"[]"` per GraphQL convention — align with MCP: prefer **`null`** for absent requirements when empty).

## Structured JSON profile (normative for generic PRDs)

If the root JSON matches:

```json
{
  "title": "Plan title",
  "tasks": [
    { "title": "Task A", "requirements": ["r1", "r2"] },
    { "title": "Task B", "requirements": ["r3"] }
  ]
}
```

then map **directly**: plan title from `title`; each `tasks[]` element → `CreateTaskInput` with `requirements: JSON.stringify(requirements ?? [])`. Allow **`description`** on a task object → `CreateTaskInput.description`. Unknown keys → ignore with `mapperDiagnostics` `mapper.json_unknown_keys`.

## LLM assist (future, non-default)

- **v1:** Mapper is **fully deterministic** from CIR + upload context.
- **Future:** Optional `llmRefine: boolean` could run a second pass: LLM proposes **only** edits to titles/requirements as a JSON patch against the deterministic proposal; server **re-validates** all caps, JSON shape, and rejects patches that add/remove tasks unless a separate “allow restructuring” flag is set. Documented here so implementers do not entangle LLM output with CIR parsing.

## Ordering and stability

- Tasks appear in **section pre-order** (by stable `id` order from extractors).
- Sorting keys within JSON profile tasks array preserves file order.

## References

- `docs/openthrottle/document-upload-requirements.md` — CIR, limits, security.
- `applications/openthrottle-server/src/graphql/plans/plan.input.ts` — `CreatePlanInput`.
- `applications/openthrottle-server/src/graphql/tasks/task.input.ts` — `CreateTaskInput`, `requirements`.
- `applications/openthrottle-server/src/services/plan-creation/plan-creation.service.ts` — author / assignee / status normalization at create.
