# Rules conformance

Find code in this monorepo that violates the house coding rules **that ESLint cannot or does not catch** — then file the findings as a single OpenThrottle plan.

## Cadence

Weekly. Style drift is not urgent individually but compounds fast: each unenforced violation is precedent for the next, and agents writing new code copy whatever the surrounding file already does. A weekly sweep keeps violations at the "one afternoon of mechanical cleanup" scale instead of the "we should just change the rule" scale.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

The rules themselves live in `.agents/rules/coding/**`, mirrored to `.cursor/rules/`. `.cursor/rules/` is the single source of truth for code style. Read the rule files before judging — this job enforces what is written there, not personal preference.

Commands this job uses:

```bash
pnpm run audit:component-shape             # component primitive-shape audit (R4/R5/R6/R7)
pnpm run audit:component-shape:shadcn      # same, for the shadcn package
pnpm run audit:route-shape                 # route-shape audit
pnpm nx run <project>:lint                 # for context only — this job hunts what lint misses
grep -rn --include='*.ts' --include='*.tsx' <pattern> applications packages tools
```

The rules most often violated, and what they actually say:

- **No new TypeScript `enum`s** — use `as const` objects. Pre-existing enums are grandfathered; only new declarations are findings.
- **Avoid `as` casts and `any`.** There is a known trap here: the root ESLint config forces `consistent-type-assertions` to `off`, and running `--fix` strips existing disable comments. Consequence: **these violations must be found by reading the code, not by running lint.** A clean lint run proves nothing about this rule.
- **`import type` for type-only imports**, explicit return types on exported functions, `const` over `let`, `async/await` over `.then()` chains.
- **Alphabetize** array entries and object keys when order does not matter.
- **Component/data boundaries:** a component file exports only the component and its props. Lists, copy, and other data live in the nearest `data/` folder (copy in `data.copy.ts`). Generated section comments (`Hooks` / `Setup` / `Handlers` / `Markup` / `Life Cycle` / `🔌 Short Circuit`) are kept even when empty.
- **Component shape:** one exported component per file, no file-scope helpers or data that belong hoisted, and a 210-line cap. This is what `audit:component-shape` measures.
- **UI components** come from `@openthrottle/react-router-shadcn` (source in `packages/react-router-shadcn/src/components`), not hand-rolled.
- **Tests:** use `component` (not `screen`) to get elements, and `userEvent` (not `fireEvent`).
- **No deep package imports** — consume a package through its main entry; re-export from `index.ts` rather than adding a subpath export for one symbol.
- **`@public` JSDoc** on exports that are package public API, so Knip keeps them.
- **Generators first:** new components, routes, services, and packages are scaffolded with `@tools/generators` (all generator commands need the `NX_ISOLATE_PLUGINS=false` prefix). Hand-written code that clearly skipped the generator — missing section comments, wrong folder shape — is a conformance finding.

## What to inspect

1. **Run the shape audits.** `audit:component-shape`, `audit:component-shape:shadcn`, and `audit:route-shape`. Everything they report is a finding, already grouped by rule.
2. **Read for the lint-invisible rules.** Grep plus read for: new `enum` declarations, `as` casts, `any` annotations, `.then()` chains, `let` that is never reassigned, missing `import type`, missing explicit return types on exported functions. Confirm each hit by reading the surrounding code — a cast inside a genuinely untypeable boundary may be justified; say so rather than filing it.
3. **Component/data boundaries.** Component files exporting non-component values; list or copy data defined inline instead of in the nearest `data/` folder; missing generated section comments.
4. **Test conventions.** `screen` instead of `component`; `fireEvent` instead of `userEvent`; React Router apps re-adding shims that the shared `setupReactRouterTest` setup already provides.
5. **Import hygiene.** Deep package imports (`@openthrottle/x/src/y`) instead of the main entry; missing `@public` tags on public API exports.
6. **Scope the sweep to recent code first.** Prioritize files changed in the last 60 days (`git log --since='60 days ago' --name-only`). Old violations matter less than new ones — new ones are the precedent problem.

## Ranking

Order findings by how much future wrongness they cause, and by how cheaply they can be fixed:

1. Violations in code written in the last 30 days — this is the precedent that spreads.
2. `as` casts and `any` in typed boundaries (resolvers, loaders, package public API) — these hide real type errors.
3. New `enum` declarations — an explicit, unambiguous rule, cheap to fix.
4. Component-shape and route-shape audit violations.
5. Component/data boundary violations and missing section comments.
6. Test-convention violations.
7. Everything mechanical and cosmetic: alphabetization, `let`→`const`, `import type`.

Cap the run at **15 findings, grouped by rule** — one task per rule listing every file that violates it, so each task is a single mechanical pass a cheap model can execute. If you find more, keep the top 15 and say in the plan description how many you dropped.

## Hard rules

- **Read-only on source code.** Never edit, fix, or refactor anything — not even a one-character `let`→`const`. Filing the finding is the job.
- **Never run `lint --fix`** in this job. The root config's `consistent-type-assertions: off` combined with `--fix` strips existing disable comments, which silently makes the codebase worse.
- Never open a pull request, never commit, never push.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no installs, no generators).
- Do not propose changing a rule. If a rule looks wrong, note it in the plan description as an observation — the rule is out of scope for this job.
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Rules conformance: …`, and there is existing lint-tightening and component-shape work in the backlog.
- `semantic_search` on each finding's subject (the rule name plus the project) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it** — do not re-file.
- If an open plan covers the rule but misses newly violating files, add those as a task to the existing plan (`create_tasks`) rather than opening a second plan.
- Only open a new plan for findings genuinely not represented anywhere.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Rules conformance: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `tooling`.
- **Description:** how the sweep was run, which rules were checked by audit versus by reading, how many findings were dropped by the cap, and anything skipped as a duplicate or judged a justified exception.
- **Tasks:** one per rule, ordered by the ranking above, each fully self-contained:
  - the rule, quoted from its file in `.agents/rules/coding/**`,
  - every violating file with line numbers,
  - the mechanical transformation to apply, and any listed file that is a deliberate exception,
  - explicit acceptance criteria, including that `lint`, `typecheck`, and `test` stay green for the touched projects and the relevant `audit:*` target gets quieter.

If nothing material is found, **file nothing** and say so plainly in your final message. An empty run is a valid outcome; a padded plan is not.
