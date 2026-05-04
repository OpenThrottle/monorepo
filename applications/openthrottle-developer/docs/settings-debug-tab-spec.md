# Product spec: Settings → Debug (openthrottle-developer)

**Status:** PRD-ready for implementation and regression review.

**Route:** `/settings/debug`  
**Components:** `app/routes/settings.debug.tsx` (loader), `app/routing/settings/components/SettingsDebugPanel.tsx` (UI), `app/routing/settings/utils/sanitize-client-env.ts` (sanitization).

## 1. Problem and audience

Developers and support need a **safe, in-app** place to confirm that the client shell, public environment, and API are wired correctly—without pasting raw `.env` or secrets into tickets.

**Primary users:** Local developers, on-call triage, internal support.

**Out of scope for this tab alone:** Server-side secret inventory, full log streaming (see Settings → Logs spec), or editing feature flags at runtime (display-only unless product adds toggles later).

## 2. Goals

- Surface **read-only** diagnostics: flags visible to the client, masked env snapshot, storage previews, and GraphQL-backed API health.
- Make **copy-to-clipboard** paths obvious for support bundles (sanitized JSON only).
- Link to **monorepo docs** for React Router / Vite devtools rather than duplicating long procedural content in-app.

## 3. Feature flags section

**Intent:** Show effective client-relevant flag state and how to change dev-only flags (with restart semantics).

**Acceptance criteria**

- List at least: `FEATURE_BETA_PREVIEW` with boolean display.
- Document `REACT_ROUTER_DEV_TOOLS`: set in `.env`, requires Vite dev server restart; link or inline pointer to the monorepo devtools doc.
- Clarify which flags are **not** on `window.env` (e.g. `APP_ENABLE_ANALYTICS`, `APP_ENABLE_AUTHENTICATION`) so users know where else to look.

**Non-goals:** Live toggles that mutate process env without restart (unless explicitly added later).

## 4. Sanitized env snapshot

**Intent:** Tabular view of `getEnvironment()` keys after `sanitizeEnvForDiagnostics`, plus **Copy JSON** for support.

**Acceptance criteria**

- Keys sorted alphabetically; values masked per `maskSensitiveEnvValue` (tokens, secrets, passwords, `api_key`, `ROLLBAR_TOKEN` patterns).
- Copy produces **only** the sanitized object (never raw secrets).
- Scrollable table with reasonable max height for large env maps.

## 5. React Router / Vite devtools

**Intent:** Explain **when** to open bundle analyzer vs React Router DevTools vs `vite build --profile`, and deep-link to canonical docs.

**Acceptance criteria**

- Links to `docs/monorepo/openthrottle-developer-vite-devtools.md` (and profiling companion) via stable href helpers (`settings-docs-links`).
- Copy clarifies that `REACT_ROUTER_DEV_TOOLS` should be session-scoped for noisy debugging, not left on permanently.

## 6. localStorage and sessionStorage

**Intent:** Read-only inventory with privacy-conscious previews.

**Acceptance criteria**

- Enumerate keys from `localStorage` and `sessionStorage` separately; sort keys alphabetically.
- Previews: truncate long values; mask rows whose keys suggest secrets (`token`, `auth`, `secret`).
- **Refresh** re-reads storage without full page reload.

**Non-goals:** Editing or deleting keys from this screen (optional future).

## 7. GraphQL endpoint health

**Intent:** Prove the browser can reach **openthrottle-server** with the same auth path as the rest of the app, and show latency plus dependency checks.

**Contract**

- Loader runs `executeGraphqlWithAuth(request, GetRootHealthDocument)` (same pattern as root health).
- Success: `latencyMs`, `serverHealth` fields (`api`, `database`, `redis`, `websocket`).
- Failure: `latencyMs`, `error` message string (safe to show in UI; avoid logging tokens).

**Acceptance criteria**

- **Re-check** triggers route revalidation (not a silent infinite poll).
- Loading state disables duplicate submits.

**Note:** In-app copy may refer to the operation colloquially; align documentation with the actual document name used in code (`GetRootHealth` / `serverHealth` field).

## 8. Related surfaces (out of tab scope but linked)

- **Ports & API troubleshooting:** `SettingsPortsTroubleshootingCard` on the same page for host/port misconfiguration.
- **Server metrics definitions:** On-page explanation of footer metrics when visible (aligns with GlobalMetrics documentation task).

## 9. Privacy and support guidance

- Never instruct users to paste raw `.env` into tickets.
- Clipboard exports should only include **sanitized** env JSON from this screen.
- Storage previews remain best-effort redaction; users clearing sensitive keys before sharing remains a valid workflow.

## 10. Test and regression hooks

- Unit coverage: `app/routes/__tests__/settings.debug.test.tsx` exercises `SettingsDebugPanel` section presence.
- When changing sanitization rules, update `sanitize-client-env` tests if present or add them alongside loader behavior.

---

This spec is the single source of truth for **what** the Debug tab must deliver; implementation details stay in the referenced modules.
