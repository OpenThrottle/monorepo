# Document upload: formats, limits, security, and canonical model

This note captures **product and technical requirements** for ingesting user documents (Markdown, Excel, CSV, HTML, JSON) and decomposing them into Cortex **Plan → Tasks → Requirements**, before implementation tasks (parsers, API, UI). It aligns with existing GraphQL inputs (`CreatePlanInput`, `CreateTaskInput` with `requirements` as a JSON string array) and the shared `PlanCreationService` / MCP `create_plan` path.

## Supported formats and MIME types

Accept uploads **only** when **declared MIME type** and **file extension** both match an allowed pair (defense in depth). Reject ambiguous `application/octet-stream` unless paired with a known extension.

| Format                  | Extensions         | Primary MIME types                                                  | Notes                                                                                  |
| ----------------------- | ------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Markdown                | `.md`, `.markdown` | `text/markdown`, `text/x-markdown`                                  | UTF-8 only for v1; normalize newlines.                                                 |
| Excel (Office Open XML) | `.xlsx`            | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | **No** `.xls` in v1. No macro-enabled `.xlsm`.                                         |
| CSV                     | `.csv`             | `text/csv`, `application/csv`                                       | Sniff delimiter heuristically; UTF-8 default with optional BOM strip.                  |
| HTML                    | `.html`, `.htm`    | `text/html`                                                         | Parse as document; **do not** execute scripts or load external resources during parse. |
| JSON                    | `.json`            | `application/json`                                                  | Must parse as JSON; reject trailing garbage.                                           |

**Out of scope for v1:** `.xls`, `.xlsm`, `.ods`, PDF, images, archives (zip), and `text/plain` masquerading as other types.

## Size and volume limits

- **Raw upload size:** default **10 MiB** (10,485,760 bytes), consistent with the historical `graphql-upload-ts` sketch in `applications/openthrottle-server/src/main.ts`. Final value should be **configurable** (e.g. `DOCUMENT_UPLOAD_MAX_BYTES`) so deployments can tighten or relax.
- **Post-parse text budget:** cap total extracted Unicode scalar values (e.g. **2 Mi chars**) to bound memory, embedding cost, and DB load. Exceeding the cap yields a **partial parse** with diagnostics (see below) rather than silent truncation without notice.
- **Structure caps (abuse prevention):** suggest defaults: **≤ 500** proposed tasks per upload, **≤ 50** requirement strings per task, each requirement string **≤ 8 KiB** after trim. Configurable if needed.

## Virus and malware stance (v1)

- **No dedicated antivirus engine in v1.** Rationale: uploads are **parsed**, not executed as binaries; XLSX/HTML parsers must use safe libraries and **disable** features that fetch network content or run macros.
- **Mitigations in v1:** allowlist MIME + extension, size limits, parse-only pipeline, no execution of embedded scripts in HTML/XLSX.
- **Future hook:** document an optional integration point (e.g. ClamAV or cloud scanning on temp files) without blocking the initial design.

## PII and sensitive data

- **Tenant responsibility:** uploads may contain PII; operators should follow org policy. The product should **not** log raw file bodies at info level.
- **Persistence:** Parsed content maps to existing plan/task fields and embeddings (same sensitivity class as manually entered plans). **Secrets:** do not add features that encourage pasting keys/passwords; if detected in preview (simple heuristics only), **warn** in UI—hard blocking is optional and can false-positive.
- **HTML:** Strip or ignore `<script>`, `on*` event attributes, and `javascript:` URLs in the parse model used for decomposition (not necessarily in a future “faithful preview” feature).

## Canonical intermediate representation (CIR)

All format-specific extractors **normalize into one in-memory structure** before mapping to `CreatePlanInput` and `CreateTaskInput[]`. This isolates parsers from GraphQL and allows tests per format plus one mapper test.

### Top-level shape (normative for implementers)

- **`meta`:** `{ format: 'md' | 'xlsx' | 'csv' | 'html' | 'json'; filename: string; mimeType: string; extractedCharCount: number }`
- **`sections`:** ordered tree of **sections** (flat list with `parentSectionId` is acceptable).
- **`artifacts`:** optional tables or key-value rows not yet assigned to a section (spreadsheet sheets, loose markdown tables).
- **`diagnostics`:** `{ level: 'warn' | 'error'; code: string; message: string; path?: string }[]` — malformed regions, charset issues, cap violations.

### Section node

Each section carries content that mappers can turn into a **task** or **plan-level** narrative:

- `id` (stable string within the document, e.g. synthetic increment)
- `parentId` | `null`
- `title` (string | null) — e.g. markdown heading, sheet name, JSON key
- `body` (string | null) — prose under that heading
- `checklistItems` (string[]) — bullet/checkbox lines → candidate **requirements**
- `tables` (optional): `{ headers: string[]; rows: string[][] }[]` for column-to-requirement mapping rules later

### Mapping target (downstream contract)

- **Plan:** `CreatePlanInput` — `title`, `author`, `category` required; others optional; `assignee` normalized to GitHub login or null per `PlanCreationService`.
- **Tasks:** `CreateTaskInput` — `planId` set after plan create; `title` required; `requirements` JSON string array of strings; `description` / `summary` / `status` / `assignee` / `category` / `project` / `projectId` optional per existing schema.

The **mapper** (separate task) reads `sections` + `artifacts` + `diagnostics` and produces a **proposal** object: `{ plan: CreatePlanInput; tasks: CreateTaskInput[] }` with **no** DB writes until the user or API confirms (per plan UX task).

## Error handling expectations

- **Reject before parse:** wrong type, oversize, empty file.
- **Reject after parse:** invalid JSON syntax; HTML/XML parse failure if strict mode is on (configurable: strict vs best-effort with errors in `diagnostics`).
- **Partial success:** allowed only when `diagnostics` contains recoverable warnings; **errors** should fail the proposal unless an explicit “best effort” flag is later added (not required in v1).

## References

- `docs/openthrottle/document-upload-mapping-rules.md` — deterministic CIR → Plan / Tasks / Requirements mapping.
- `applications/openthrottle-server/src/graphql/plans/plan.input.ts` — `CreatePlanInput`
- `applications/openthrottle-server/src/graphql/tasks/task.input.ts` — `CreateTaskInput`, `requirements` JSON string
- `applications/openthrottle-server/src/services/plan-creation/plan-creation.service.ts` — shared plan creation and assignee normalization
