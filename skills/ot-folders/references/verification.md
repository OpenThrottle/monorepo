# Verification tiers and what blocks a merge

Read when you are about to commit or open a PR and need to know which check covers what you touched.

Cheapest first. Stop at the tier that covers what you touched.

**1 — Just this file.** Picks up all three custom rules and the `max-lines` cap.

```bash
pnpm exec eslint applications/openthrottle-developer/app/routing/plans/components/AddHookDialog.tsx
```

Exits 0 on warnings, non-zero on errors — so a `route-primitive-shape` or
`pre-hooks-unpack` warning will _not_ fail this. Read the output, don't just check
the exit code.

**2 — The shape audits.** Repo-wide inventory plus the CI gate.

```bash
pnpm run audit:component-shape:strict
pnpm run audit:component-shape:shadcn:strict
pnpm run audit:route-shape:strict
pnpm nx run monorepo:check-folder-vocabulary
```

`check-folder-vocabulary` fails on any tracked path under a rule-4 junk-drawer
folder and names the replacement; `check:local` and the CI `gates` job run it too.
`pnpm run check:local:audit` runs the three shape audits. Note what `--strict` actually gates:
the component audit exits non-zero on **R4/R5/R6** (hoist violations,
multi-component files, and authored components over the 210-line cap). Its R6
count matches ESLint's `max-lines` exactly, and it repeats that cap on purpose:
lint-staged runs `eslint --fix` before `prettier --write`, so prettier can reflow
a file past 210 after lint has passed. The shadcn profile's VR6 cap stays
report-only.

**3 — New project, moved package, changed tags.**

```bash
pnpm run nx:validate-tags
pnpm run check:local:package-entrypoints
```

**4 — The full local gate.** The slow one — affected lint, typecheck and test
across the workspace, plus every check above. Run it before opening a PR, not
after every edit.

```bash
pnpm run check:local
```

### What actually blocks a merge

The blocking versus advisory split, the warn-first rollout and a known `nx:validate-configurations` exit-code quirk live in
[CI-quality-gates.md](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/CI-quality-gates.md#shape-rule-rollout-and-local-quirks).
Advisory is not optional — write new code to the standard.
