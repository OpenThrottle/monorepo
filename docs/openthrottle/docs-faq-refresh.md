# Docs & FAQ refresh — design note

Companion to the [docs/FAQ content convention](./docs-faq-convention.md). Locks the decisions for OpenThrottle plan `83ae448b-70b2-407f-88e9-0664d25604dc` ("Docs & FAQ refresh — content depth + toggleable UX upgrades") before implementation.

This note is authored once and is stable for the plan; the plan/tasks themselves live in OpenThrottle, not here.

## 1. Scope

The `/docs` and `/faq` routes in `applications/openthrottle-developer` are thin: `/faq` opens with a literal _Lorem ipsum_ paragraph over a 3-entry accordion, and `/docs` has 4 flat Markdown pages with a bare sidebar + article layout (no search, no on-page TOC, no prev/next, no code-copy, weak landing).

Two workstreams:

1. **Content depth** (always on, not flag-gated) — expand the docs pages and FAQ entries and delete placeholder copy. See §6.
2. **Four presentation upgrades** (§2), each independently toggleable so the owner can A/B the page with and without each one.

## 2. The four upgrades → five flags

The four upgrades decompose into five independent flags (the "smaller upgrades" bundle splits prev/next from code-copy so each can be judged on its own):

| Flag       | Upgrade                                             | Default |
| ---------- | --------------------------------------------------- | ------- |
| `search`   | Client-side search across the manifest (docs + FAQ) | `true`  |
| `toc`      | On-page right-rail TOC + copy-anchor links          | `true`  |
| `prevNext` | Sequential prev/next nav between docs pages         | `true`  |
| `codeCopy` | Copy-to-clipboard button on fenced code blocks      | `true`  |
| `landing`  | Card overview for `/docs` + `/faq` intro/hero       | `true`  |

**Defaults are all `true`.** The refresh exists to make the thin pages better; the improved experience should be visible out of the box. A flag flipped `false` is the _comparison baseline_ (the current thin behavior), which is exactly what the owner reaches for when A/B testing — not a feature that has to be discovered and enabled. The placeholder-copy removal (§6) is **permanent and never flag-gated**: it is a correctness fix, not an upgrade.

## 3. `DocsFeatureFlags` shape

Typed as an `as const` object with per-flag defaults (no TypeScript enums, per `.cursor/rules`). Lives in the app at `app/global/config/docs-feature-flags.ts`:

```ts
export const DOCS_FEATURE_FLAG_DEFAULTS = {
  codeCopy: true,
  landing: true,
  prevNext: true,
  search: true,
  toc: true,
} as const;

export type DocsFeatureFlags = {
  readonly [K in keyof typeof DOCS_FEATURE_FLAG_DEFAULTS]: boolean;
};
```

Keys are alphabetized (code-style rule). A runtime type guard (`isDocsFeatureFlags`) validates stored values so a malformed localStorage payload falls back to defaults rather than throwing.

These are **per-user runtime toggles** and are deliberately distinct from the build-time env flags in `@openthrottle/react-router-utils/src/config/features` (e.g. `FEATURE_BETA_PREVIEW`). Those are sourced from env at server start; these are read per-user from `localStorage` in the browser.

## 4. Persistence & SSR safety

Reuse the app's existing per-user persistence — no new storage mechanism:

- Storage: `app/global/config/persistent-setting-storage.ts` (namespaced `localStorage`, `useSyncExternalStore`-friendly snapshot cache).
- Hook: `app/global/hooks/usePersistentSetting.ts` (`[value, setValue]`, SSR-safe via `getServerSnapshot`).
- New hook `useDocsFeatureFlags()` wraps `usePersistentSetting<DocsFeatureFlags>('docs.featureFlags', DOCS_FEATURE_FLAG_DEFAULTS, isDocsFeatureFlags)` and returns `[flags, setFlag]`, where `setFlag(key, enabled)` merges one flag over the stored object.

**SSR:** `getPersistentSettingSnapshot` returns the fallback when `!IS_BROWSER`, and `usePersistentSetting`'s `getServerSnapshot` returns `defaultValue`. So flags resolve to `DOCS_FEATURE_FLAG_DEFAULTS` on the server _and_ on the first client render, then reconcile to the stored value after mount — no hydration mismatch. Because every default is `true`, SSR HTML always contains the full experience; toggling `false` only ever removes DOM on the client, which is safe.

Storage key (namespaced by the store prefix): `openthrottle-developer:setting:docs.featureFlags`.

## 5. Settings surface

Toggles live in **Settings → Debug** (`app/routes/settings.debug.tsx`), rendered by a new `SettingsDocsExperimental` panel component under `app/routing/settings/components/`, styled with `OpenThrottleFieldset` + shadcn `Switch` (matching the existing `SettingsFeatureFlags` panel). One labeled `Switch` per flag; flipping it calls `setFlag` and persists immediately (survives reload + cross-tab via the storage store).

Panel legend: **"Docs (experimental)"**. Per-flag label + helper copy:

| Flag       | Label            | Helper copy                                                         |
| ---------- | ---------------- | ------------------------------------------------------------------- |
| `search`   | Search           | Command-palette search across docs and FAQ (⌘K / Ctrl-K).           |
| `toc`      | On-page contents | Right-rail table of contents with scroll-spy and copy-anchor links. |
| `prevNext` | Prev / next      | Sequential links between docs pages.                                |
| `codeCopy` | Copy code        | Copy button on fenced code blocks.                                  |
| `landing`  | Rich landing     | Card overview on `/docs` and a category hero on `/faq`.             |

## 6. Component API contract

Every new presentation component lives in `@openthrottle/react-router-docs` (source-first — no `build` target) and takes **explicit props (data + behavior), never a flag or the persistence hook**. The route reads flags via `useDocsFeatureFlags()` and either renders the component or not (`search`, `landing`, `prevNext`, `toc` gate whole components) or passes an `enabled`/behavior prop where the component must still render structure (`codeCopy` → a `copyable` prop on the code-block renderer). This keeps package components deterministic in tests: a test renders them ON and OFF by passing props, with no localStorage or SSR involvement.

Routes are the only place flags → props translation happens; the package stays flag-agnostic and framework-persistence-agnostic.

## 7. Content inventory

### Docs pages (task 7) — `app/docs-content/docs/`

Groups use numeric-prefixed labels (`00. …`) so the package's alphabetical group ordering yields a sensible sidebar order (existing convention — see `docs/index.md`'s `00. General`).

| File                   | Group                 | Order | Action  | Notes                                                                |
| ---------------------- | --------------------- | ----- | ------- | -------------------------------------------------------------------- |
| `index.md`             | `00. Getting Started` | 1     | Rewrite | Landing intro matching the new card overview.                        |
| `getting-started.md`   | `00. Getting Started` | 2     | Deepen  | Node ≥ 22 + pnpm-only, database:start/migrate, dev servers, codegen. |
| `architecture.md`      | `01. Concepts`        | 1     | New     | Nx + pnpm monorepo; applications / packages / tools layout.          |
| `plans-and-tasks.md`   | `01. Concepts`        | 2     | New     | OT is source of truth via openthrottle-mcp; no Markdown plans.       |
| `agentic-workflows.md` | `01. Concepts`        | 3     | New     | Ralph loop overview + Plan-Id/Task-Id traceability.                  |
| `docker-compose.md`    | `02. Development`     | 1     | Regroup | Existing content; renumber group.                                    |
| `docker-builds.md`     | `02. Development`     | 2     | Regroup | Existing content; renumber group.                                    |
| `troubleshooting.md`   | `03. Operations`      | 1     | New     | Common local-dev issues + fixes.                                     |

### FAQ entries (task 8) — `app/docs-content/faq/`

One file per question; `group` frontmatter is the category; `title` is the question. Target ~12–15 entries across 5 groups (up from 3). Slugs derive from filenames, so each entry stays deep-linkable via `#<slug>`.

| Group                   | Sample entries                                                                  |
| ----------------------- | ------------------------------------------------------------------------------- |
| `00. General`           | What is OpenThrottle? · What is the developer app? · Open-core / licensing.     |
| `01. Local Development` | How do I run the app locally? · Prerequisites? · How do I run tests? · Codegen? |
| `02. Plans & Tasks`     | Where are plans stored? · How do I create a plan? · What is Plan-Id/Task-Id?    |
| `03. Agents & Ralph`    | What is Ralph? · How does the plan loop work?                                   |
| `04. Troubleshooting`   | Port already in use · pnpm install fails · Tests won't collect (codegen).       |

Final counts/wording are finalized in tasks 7 & 8; content must be verified against `CLAUDE.md` / `AGENTS.md` (no invented Nx targets).

## 8. Validation posture

Per-feature route + component tests covering flag ON **and** OFF; `pnpm nx run <project>:lint|typecheck|test` for both `@openthrottle/react-router-docs` and `openthrottle-developer`; a consumer `openthrottle-developer:build` as the source-first integration check; and browser-preview screenshots of each toggle state plus an all-off baseline (task 10). Targets run sequentially — the Nx cache is shared.
