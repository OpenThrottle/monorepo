# Product spec: Settings → Logs (openthrottle-developer)

**Status:** PRD-ready for implementation and regression review.

**Route:** `/settings/logs`
**Components:** `app/routes/settings.logs.tsx`, `app/routing/settings/components/SettingsLogsPanel.tsx`, `app/routing/settings/client-log-sink.ts` (capture), `app/routing/settings/utils/sanitize-client-env.ts` (bundle env).

## 1. Problem and audience

Developers need **browser-side** log lines and a **paste-safe JSON bundle** for tickets without exporting raw secrets or ssh-ing to servers for every UI glitch.

**Primary users:** Local developers, internal support, on-call triage.

**Out of scope until APIs exist:** Live tail of server workflow-ralph stderr, queue workers, or hosted agent logs inside this tab (see §7 for future contract notes). Plan detail and CLI remain the source for Cortex plan output today.

## 2. Goals

- Provide a **read-only viewer** of client console output captured in-session (ring buffer).
- Offer **Copy lines**, **Copy JSON** (support bundle), and **Download JSON** with **sanitized** env only.
- Document **future** workflow/agent log integration so engineering can plug an operator API without redesigning the bundle shape.

## 3. Client log sink

**Intent:** Intercept `console` at standard levels and global errors so the Logs tab reflects what the shell emitted, without replacing the browser devtools console.

**Installation:** `installClientLogSink()` runs once from `app/entry.client.tsx` (browser entry).

**Captured levels:** `log`, `info`, `warn`, `error`, `debug`; plus `window` `error` and `unhandledrejection` (normalized to error lines).

**Buffer:** In-memory ring, **last 1000 entries** (`MAX_ENTRIES`). Oldest lines drop when full. **Clear** resets the buffer only (does not affect server or real console).

**Serialization:** `formatLogArgs` stringifies each console call (strings as-is, `Error` prefers stack, objects via `JSON.stringify` with `String` fallback).

**Acceptance criteria**

- Viewer shows ISO timestamps, level tags, and message text; auto-scrolls to bottom on new lines when the `<pre>` ref is mounted.
- Empty state copy explains that users may need to use the app or open devtools to produce traffic.
- Unit tests cover sink behavior (`client-log-sink.test.ts`); route/panel tests assert headings and workflow placeholder state.

**Non-goals:** Persisting logs across full page reloads; capturing network HAR; patching `console` in workers unless product expands scope.

## 4. Support bundle (JSON)

**Intent:** One payload shape for **copy** and **download** so support can compare env + client logs + page context without raw `.env`.

**Payload kind:** `support`, **version** `1` (bump version when adding breaking fields).

**Fields (conceptual)**

- `generatedAt`, `note` (privacy reminder).
- `env`: output of `sanitizeEnvForDiagnostics(getEnvironment())` — **never** raw process secrets.
- `clientLog`: array of `{ t, isoTime, level, message }` derived from the sink snapshot at bundle time.
- `page`: `href`, `referrer`.
- `runtime`: `userAgent`, `language`.
- `workflowLogs`: placeholder object until server APIs exist — see §7.

**File naming (download):** `openthrottle-developer-support-<ISO-ish-stamp>.json` (filename-safe timestamp).

**Acceptance criteria**

- **Copy JSON** and **Download JSON** both use the same builder (`buildSupportBundlePayload` or equivalent) so payloads never diverge.
- Clipboard and file contain **only** redacted env; in-app copy warns not to paste raw tokens.

## 5. Workflow and agent logs (server) — current vs future

**Current (UI):** Card explains that stderr / queue / plan-output streams are **not** exposed in-app; links to `tools/workflows` README and Plan detail for Cortex output; `workflowLogs.apiStatus` is `not_available` with a **hint** string for CLI-oriented debugging.

**Future API contract (sketch — not blocking ship)**

- Authenticated operator endpoints: query list, **SSE** or chunked poll for tail segments scoped to org/user.
- Correlation IDs tying queue jobs, plan IDs, task IDs; structured levels and timestamps.
- **No** secrets in payloads; rate limits and max bytes per session.
- When live: extend `workflowLogs` in the bundle with `{ apiStatus: 'available' | 'error', segments?, traceId?, linkToPlan? }` (exact shape TBD); preserve backward compatibility by bumping bundle `version` if needed.

## 6. Privacy and support guidance

- Treat the bundle as **best-effort safe**; env still goes through the same masking rules as Settings → Debug.
- Client log lines may contain app URLs or user-visible strings — reviewers should scrub ticket text if needed.
- Do not instruct users to attach raw `.env` or session tokens outside the sanitized bundle path.

## 7. Related surfaces

- **Settings → Debug:** sanitization patterns and GraphQL health — See `docs/settings-debug-tab-spec.md`.
- **Plan detail:** canonical place for Cortex plan output stream until server logs land here.

## 8. Test and regression hooks

- `SettingsLogsPanel.test.tsx`: layout, workflow card messaging, bundle payload `workflowLogs.apiStatus`.
- `settings.logs.test.tsx`: route renders panel.
- Changes to bundle shape require updating this spec and bumping `version` in code comments.

---

This spec is the single source of truth for **what** the Logs tab must deliver; implementation details stay in the referenced modules.
