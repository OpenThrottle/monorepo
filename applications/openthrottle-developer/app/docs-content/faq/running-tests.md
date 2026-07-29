---
group: 01. Local Development
order: 3
title: How do I run tests?
---

Run a project's Vitest suite with `pnpm nx run <project>:test` (add `--watch` for watch mode, or `-- path/to/file.test.ts` for a single file). Use `pnpm run check:local` to mirror CI locally. Note that `typecheck` type-checks source and tests but does **not** execute them — only `test` runs assertions.
