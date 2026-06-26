# @openthrottle/openthrottle-developer-codegen

Workspace-only GraphQL codegen output for the `openthrottle-developer` app.

This package runs a **second** codegen pass over the developer app's GraphQL
documents (`applications/openthrottle-developer/app/**/*.graphql`) and emits the
typed operations and runtime enum objects into `src/__generated__/`. It is a
source-first package (`main`/`types` point at `./src/index.ts`); consuming apps'
Vite transpiles it — there is no `build` step.

## Why it exists (dual-codegen role)

The developer app's own codegen (`applications/openthrottle-developer/codegen.ts`)
uses `enumsAsTypes: true`, so the app's `app/__generated__` enums are type-only
unions with no runtime value. This package deliberately **omits** `enumsAsTypes`,
so its enums are emitted as real runtime `enum` objects. Code such as
`PromptsTable.tsx` imports `CustomPromptType` from this package specifically to
get the runtime object (e.g. `CustomPromptType.Agents`), which the app's own
codegen cannot provide.

See `codegen.ts` for the full, load-bearing rationale on how this config
intentionally diverges from the app's — do not "align the configs".

## Consumption

This is a `private`, `publish:false` workspace package. Do **not** `pnpm add` /
`npm install` it from a registry — there is no published artifact. Depend on it
from another workspace project with the workspace protocol:

```jsonc
// package.json
"dependencies": {
  "@openthrottle/openthrottle-developer-codegen": "workspace:^"
}
```

## Regenerating (`src/__generated__/`)

The repo ships only a `.gitkeep` placeholder for `src/__generated__/` until
codegen runs, and `src/index.ts` re-exports the generated modules. A fresh
checkout therefore **cannot typecheck or build this package until codegen has
run**. Regenerate with:

```bash
pnpm nx run @openthrottle/openthrottle-developer-codegen:codegen-graphql
```

`verify-graphql-codegen` regenerates and fails if the committed
`src/__generated__/` output drifts; CI runs it to catch stale output.
