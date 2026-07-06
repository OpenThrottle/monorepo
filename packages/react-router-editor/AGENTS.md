# @openthrottle/react-router-editor — agent notes

Monaco-based editor for OpenThrottle custom prompts: tabbed files, searchable/filterable sidebar,
Jotai state, and React Router URL sync.

**Consumed by:** `openthrottle-developer` (`prompts.create.tsx`, `prompts.$promptId.tsx`,
`routing/plans/components/PlanTabDetails.tsx`).

## Layout

- [src/components/EditorWindow.tsx](src/components/EditorWindow.tsx) — Monaco wrapper; the `path` prop keys one text model per file.
- [src/config/loader.ts](src/config/loader.ts) — `configureEditorLoader()`: points `@monaco-editor/react` at the vendored `monaco-editor` instead of the CDN.
- [src/data/atom.editor.ts](src/data/atom.editor.ts) — Jotai editor state (files, tabs, search/type filters) + derived atoms.
- [src/hooks/useEditor.tsx](src/hooks/useEditor.tsx) — state + navigation; navigates to `${basePath}/<encoded filename>` (default `basePath` is `/prompts`).

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- **Monaco loads from a CDN by default.** `@monaco-editor/react` lazy-loads the Monaco bundle and language workers from `cdn.jsdelivr.net` unless `configureEditorLoader()` is called client-side AND the consuming Vite app configures `MonacoEnvironment` with `?worker` imports (README has both snippets). As of writing, **no app in the repo calls either** — consumers currently load Monaco from the CDN; wire both if offline/CSP/supply-chain matters for your change.
- `configureEditorLoader()` is idempotent, client-only (server no-op), and imports `monaco-editor` dynamically to keep it out of SSR and test collection — never import `monaco-editor` statically in this package.
- `EditorWindow`'s `value` is the **active file only**, not an aggregate of open tabs. When tabs change, swap `value` and `path` together; changing `value` without `path` reuses one shared Monaco model, so undo/redo stack, cursor, and scroll state bleed across tabs.
- Prompt types are the `PROMPT_TYPES` `as const` object (`agents` / `commands` / `prompts` / `skills`) — extend it there, not with a new enum.

## Pointers

- [README.md](README.md) — component/hook API, self-hosting Monaco + worker configuration snippets.
