# ADR: Cross-app docs/FAQ delivery

**Status:** Accepted — OpenThrottle plan `f0f27c66-8dba-4e75-928b-c219f7a7ff5c`. Inputs: requirements inventory (task 1) and feasibility spike (task 2) recorded in that plan's output stream.

**Context:** The platform has four React Router apps that need docs/FAQ surfaces (openthrottle-developer, -admin, -website, -email) with more to come, and **none has one today**. The immediate want is an FAQ route in the developer app. The risk we are deciding against is **N bespoke docs implementations** — the developer `legal.*` routes (license, privacy-policy, terms-of-use) are already hand-written TSX content pages and demonstrate that drift. We want every app to get docs/FAQ "for free" from a shared layer fed by a per-app content folder, with consistent nav and styling.

## Decision

**Adopt option 3: a shared, source-first React Router package (`@openthrottle/react-router-docs`) that renders a conventional per-app content folder as docs/FAQ routes.** Not a standalone docs app, and not hand-built per-app routes.

### Options considered

| Option                                                    | DX (cost to add docs to a new app)                          | Nav/style consistency                                      | Website SEO                                    | Reuses existing primitives                                                                       | Authoring                                        |
| --------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 1. Standalone docs app (`applications/openthrottle-docs`) | New app + deploy surface; content lives away from each app  | High (one app) but **separate** from each product's chrome | Own SSR; but one domain for all docs           | Poorly — doesn't sit inside each app's auth/layout                                               | Centralized, far from the code it documents      |
| 2. Per-app hand-built route                               | Highest — re-implemented every app (the `legal.*` problem)  | Low — drifts per app                                       | Per app, ad hoc                                | n/a                                                                                              | Per app, inconsistent                            |
| **3. Shared package + per-app content folder (CHOSEN)**   | **Lowest** — drop files in a folder, mount one route module | **High** — one rendering layer, shared nav/layout          | **Yes** — SSR via the now-SSR-capable renderer | **Strongly** — composes `react-router-markdown`, `react-router-ui-global`, `react-router-shadcn` | In-repo, beside each app, consistent frontmatter |

### Why option 3

- The repo already has the building blocks: `@openthrottle/react-router-markdown` (MDX + remark-gfm; **made SSR-capable** under this plan), `@openthrottle/react-router-ui-global` (`GlobalScreen`/`GlobalHeading`/breadcrumb handle), `@openthrottle/react-router-shadcn` (styling). A standalone app would reuse these least.
- Docs render **inside each app's existing chrome and auth posture** — internal apps stay auth-gated; the public website serves public docs — without a separate deploy.
- The spike proved the mechanics: `import.meta.glob` loads a (nested) content folder at build time and content server-renders to real HTML.

### Architecture

1. **Source-first package** `@openthrottle/react-router-docs` — no `build` target; `main`/`types` → `src/index.ts` (per the `react-router-*` convention). Consumer Vite transpiles it.
2. **App owns the glob.** `import.meta.glob` resolves relative to the calling file, so a package-side glob can't see an app's content. Each app calls `import.meta.glob('./<content-folder>/**/*.md', { eager: true, query: '?raw', import: 'default' })` and passes the module map into a package factory (`buildDocsManifest(modules)` / route builder). **The package never globs.** This is the central contract.
3. **Rendering delegates to `react-router-markdown`.** No new Markdown engine. Because `MarkdownRenderer` now compiles synchronously, content lands in SSR HTML — so the same path serves the public website's SEO and the internal apps.
4. **Layout/styling** via `react-router-ui-global` + `react-router-shadcn`; nav/breadcrumbs plug into the existing `GlobalLayoutBreadcrumbsHandle` convention.
5. **Content authored in-repo** as Markdown + frontmatter in the per-app folder. Convention (folder location, frontmatter schema, nav/route mapping, FAQ vs docs shapes) is defined in tasks 4–5.

### Website SEO (the one open risk) — resolved

The original blocker was that `react-router-markdown` compiled client-side only. That has been fixed under this plan (`compileMarkdownSync` + synchronous `useMemo` render; verified with a `renderToStaticMarkup` test). Docs therefore server-render for the public website with no extra SSR machinery. **No build-time pre-compilation step is required** for v1.

## Consequences

- **Re-scopes downstream tasks:**
  - Task 8 (rendering layer) shrinks — it composes `react-router-markdown` rather than building Markdown/SSR rendering.
  - Tasks 4–6 (convention) and 7–11 (build/rollout/docs) proceed on the shared-package direction and can be unblocked.
- **New dependency:** add the pure-JS `yaml` parser to the workspace catalog for frontmatter parsing. (`gray-matter` was the initial choice but relies on Node's `Buffer` and throws in the browser, where the manifest is also built; `yaml` is browser-safe.)
- **Convention constraint:** ordering is **per-group**, not a flat global order (task 5).
- **Migration target:** the developer `legal.*` pages become the first real migration / validation of the convention (after the developer FAQ ships, task 9).
- **Not doing:** a standalone docs app or per-app bespoke routes. If a future need emerges for a single public docs domain spanning products, revisit — the content convention would still be reusable.
