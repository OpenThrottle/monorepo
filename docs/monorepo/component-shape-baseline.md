# Component primitive-shape baseline

The accurate, AST-level violation inventory for the component primitive shape
([component-primitive-shape.md](./component-primitive-shape.md)), produced by
running **both** enforcers in report-only mode across the repo. This is the
ground truth the rollout (per-project bulldoze) is sized against — marker
_presence_ via grep was only a proxy.

- **Measured:** 2026-07-30, on `ot/component-primitive-shape`.
- **Reproduce:**
  - ESLint (R1–R3, R6): `pnpm exec eslint 'applications/*/app/**/components/**/*.tsx' 'packages/*/src/**/components/**/*.tsx'`
  - Audit (R4, R5, R6, R7): `pnpm run audit:component-shape`

## Summary

| Dimension                                    | Enforcer | Result             |
| -------------------------------------------- | -------- | ------------------ |
| In-scope authored components (audit-counted) | audit    | **352**            |
| Files with R1–R3 violations                  | ESLint   | **66** (174 warns) |
| Files over the R6 210-line cap               | both     | **38**             |
| R4 file-scope helpers/data to hoist          | audit    | **56** files       |
| R5 more than one exported component          | audit    | **0**              |
| R7 hook-extraction candidates (advisory)     | audit    | **4**              |

Most of the tree already conforms: of ~352 authored components, **~846** file
lints are clean of shape/size warnings. The work concentrates in ~66 files.

## Files needing attention, by project

| Project                             | R1–R3 + R6 (ESLint) | R4 + R5 + R6 (audit) |
| ----------------------------------- | ------------------- | -------------------- |
| applications/openthrottle-developer | 44                  | 58                   |
| applications/openthrottle-email     | 8                   | 6                    |
| packages/react-router-chat          | 8                   | 11                   |
| packages/react-router-docs          | 8                   | 2                    |
| packages/react-router-floor-layout  | 8                   | 4                    |
| packages/react-router-ide           | 3                   | 1                    |
| packages/react-router-notifications | 3                   | 1                    |
| packages/react-router-profiling     | 2                   | 2                    |
| packages/react-router-scheduling    | 2                   | 1                    |
| packages/react-router-ui            | 7                   | 5                    |
| packages/react-router-ui-global     | 5                   | 3                    |

`react-router-profiling` (2 + 2) is the **pilot** — smallest self-contained
slice to prove the approach before the wider bulldoze.

## R6 — over the 210-line cap (38 files)

The 210 cap is a first tripwire ("see what barks"); these are the extraction
candidates. Worst offenders (see `pnpm run audit:component-shape` for the full
list): `RuleForm.tsx` (493), `PlanToolbar.tsx` (481), `ChatComposerToolbar.tsx`
(447), `ChatModelPicker.tsx` (411), `GlobalMetrics.tsx` (396). Distribution:
`>400: 4`, `301–400: 12`, `211–300: 22`.

## R7 — hook-extraction candidates (advisory, 4 files)

Report-only signal (R7's enforceable proxy is R6 + these counts):

- `rules/components/RuleForm.tsx` — 12 `useState`, 22 statements (the worked
  example: extract `useRuleForm`).
- `chat/.../ChatComposer.tsx` — 6 `useState`, 31 statements.
- `home/components/HomeComposer.tsx` — 1 `useState`, 36 statements.
- `plans/components/PlanDetailRoute.tsx` — 1 `useState`, 30 statements.

## Exclusion allowlist / opt-outs

**None.** No authored component uses the `/* component-shape: opt-out */`
pragma today, consistent with the spec's conform-by-default philosophy. This
section is the registry if that ever changes — each entry needs a written
reason.
