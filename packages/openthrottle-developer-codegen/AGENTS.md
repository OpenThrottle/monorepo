# @openthrottle/openthrottle-developer-codegen — agent notes

Workspace-only **second** GraphQL codegen pass over the developer app's documents
(`applications/openthrottle-developer/app/**/*.graphql`), emitting typed operations plus **runtime
enum objects** that the app's own `enumsAsTypes: true` codegen cannot provide.

**Consumed by:** `openthrottle-developer` only.

## Commands

- `pnpm nx run @openthrottle/openthrottle-developer-codegen:codegen-graphql` — regenerate
  `src/__generated__/` (schema read from `applications/openthrottle-server/schema.gql`; no running
  server needed). `codegen-graphql-watch` exists for dev.
- `verify-graphql-codegen` — regenerates and fails on drift (CI gate).

## Invariants & gotchas

- Everything meaningful here is generated: only a `.gitkeep` is committed under
  `src/__generated__/`, and `src/index.ts` re-exports the generated modules — so a **fresh checkout
  cannot typecheck, test, or lint this package until `codegen-graphql` has run**. Never hand-edit
  `src/__generated__/`; edit the app's `.graphql` sidecar files and regenerate.
- Do **not** "align" `codegen.ts` with the app's `applications/openthrottle-developer/codegen.ts`.
  Two load-bearing divergences (documented in the file header): no `enumsAsTypes` (runtime enums —
  `PromptsTable.tsx` needs `CustomPromptType.Agents` as a value), and a `.graphql`-only document
  glob (no `*.ts`/`*.tsx` scanning). Adding `enumsAsTypes` here silently breaks consumers at
  runtime.
- Source-first: no `build` target (`__build`/`__build-package` placeholders — see
  [../AGENTS.md](../AGENTS.md)); the app's Vite transpiles `src/`.
- Schema changes flow in from the root codegen flow (root `CLAUDE.md`): refresh `schema.gql`
  first, then regenerate here.

## Pointers

- [README.md](./README.md) — dual-codegen rationale and consumption notes.
- [codegen.ts](./codegen.ts) — the full "intentional divergence" comment; keep it in sync with the
  cross-reference in the app's codegen config.
