# Rules conformance

Find code in this monorepo that violates the house coding rules **that ESLint cannot or does not catch** — then file the findings as a single OpenThrottle plan.

## Cadence

Weekly. Style drift is not urgent individually but compounds fast: each unenforced violation is precedent for the next, and agents writing new code copy whatever the surrounding file already does. A weekly sweep keeps violations at the "one afternoon of mechanical cleanup" scale instead of the "we should just change the rule" scale.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

The rules live in **`docs/monorepo/code-style.md`** (rationale, examples, and the enforcement label for each), normative one-liners in **`AGENTS.md` § Code style**. Read the relevant section before judging — this job enforces what is written there, not personal preference.

**Every section of `code-style.md` carries an enforcement label: Enforced, Warned, or Honor system.** That label decides whether a rule is this job's business at all. An **Enforced** rule is an ESLint `error` or a compiler flag — CI already blocks it, so hand-hunting it is wasted effort and a clean lint run _is_ proof. **Warned** rules produce lint warnings nothing else reads; triaging them is step 2. **Honor system** rules have no machine check at all, and they are the reason this job exists.

Commands this job uses:

```bash
pnpm run audit:component-shape             # component primitive-shape audit (R4/R5/R6/R7)
pnpm run audit:component-shape:shadcn      # same, for the shadcn package
pnpm run audit:route-shape                 # route-shape audit
pnpm nx run <project>:lint                 # errors are already blocked in CI; the WARNINGS are this job's input
grep -rn --include='*.ts' --include='*.tsx' <pattern> applications packages tools
```

### This job's actual scope: the honor-system rules

These have **no machine check**. Nothing but this sweep and code review will ever catch them,
so they are the primary input. Listed in `code-style.md` section order, so the two documents
stay comparable — if a section exists there and not here, one of them has drifted.

- **[Discriminated unions](../../docs/monorepo/code-style.md#discriminated-unions)** — a `status` field alongside optional `data`/`error` is the "bag of optionals" anti-pattern; the union prevents impossible states.
- **[`interface extends` over `&`](../../docs/monorepo/code-style.md#interface-extends-over-)** — intersections of object types where `interface extends` would work.
- **[`readonly` properties](../../docs/monorepo/code-style.md#readonly-properties)** — object type properties missing `readonly` where nothing mutates them.
- **[Optional properties](../../docs/monorepo/code-style.md#optional-properties)** — `x?: T` where the value is always meant to be supplied; `x: T | undefined` is the rule.
- **[Prefer results over throwing](../../docs/monorepo/code-style.md#prefer-results-over-throwing)** — a `throw` whose only consumer is a manual `try`/`catch` at the call site.
- **[JSDoc](../../docs/monorepo/code-style.md#jsdoc-comments)** — and specifically missing **`@public`** tags on exports that are package public API, which is what keeps Knip from reporting them dead.
- **[File names](../../docs/monorepo/code-style.md#naming-conventions)** — kebab-case, except PascalCase React components. This is the one naming clause `@typescript-eslint/naming-convention` cannot see, because it operates on identifiers.
- **[General](../../docs/monorepo/code-style.md#general)** — `const` over `let` where nothing reassigns; `async`/`await` over `.then()` chains; `import * as React from 'react'`.
- **[Installing libraries](../../docs/monorepo/code-style.md#installing-libraries)** — a `package.json` version pinned by hand rather than resolved by `pnpm add`.
- **[Where code goes](../../docs/monorepo/code-style.md#where-code-goes)** — deep package imports (`@openthrottle/x/src/y`) instead of the main entry.
- **[Frontend design](../../docs/monorepo/code-style.md#frontend-design)** — hand-rolled UI where `@openthrottle/react-router-shadcn` has a primitive; raw colors or spacing bypassing the design tokens; a hand-rolled `DropdownMenu` overflow where per-row actions should use `GlobalPopover`.
- **[Testing](../../docs/monorepo/code-style.md#testing)** — `screen` instead of `component`; `fireEvent` instead of `userEvent`; assertions against duplicated copy literals instead of the constant from `data.copy.ts`; React Router apps re-adding shims `setupReactRouterTest` already provides.
- **[Generators first](../../docs/monorepo/code-style.md#generators)** — hand-written code that clearly skipped the generator (missing section comments, wrong folder shape). Generator commands need the `NX_ISOLATE_PLUGINS=false` prefix.

### Enforced by a shape audit — run the audit, do not read for these

- **[Component and data boundaries](../../docs/monorepo/code-style.md#component-and-data-boundaries)** and **[component/route shape](../../docs/monorepo/code-style.md#route-and-component-shape)** — one exported component per file, no file-scope helpers or data that belong hoisted, the six section comments kept even when empty, data and copy in the nearest `data/` folder, and the 210-line cap. `audit:component-shape` and `audit:route-shape` measure all of it.

### Already enforced at `error` — NOT this job's business

Do not hand-hunt these. CI blocks them, so a clean lint or typecheck run is proof, and time
spent reading code for them is time not spent on the honor-system list above.

`no-restricted-syntax` → new `enum` declarations · `consistent-type-assertions`
(`assertionStyle: 'never'`) → **all `as` casts** · `no-explicit-any` → **all `any`** ·
`consistent-type-imports` → `import type` · `import-x/no-default-export` → named exports ·
`sort-keys` / `perfectionist/sort-interfaces` / `perfectionist/sort-enums` → **alphabetization** ·
`no-await-in-loop` · `max-lines` · `naming-convention` → every naming clause except file
names · `noUncheckedIndexedAccess` (compiler) → unchecked indexed access.

## What to inspect

1. **Run the shape audits.** `audit:component-shape`, `audit:component-shape:shadcn`, and `audit:route-shape`. Everything they report is a finding, already grouped by rule.
2. **Triage the lint warnings.** Run lint across the workspace and collect the **warnings** — the lint target passes no `--max-warnings`, so CI is green with thousands of them outstanding and this job is the only thing that reads them. The one that matters most here is `@typescript-eslint/explicit-module-boundary-types` (362 warnings at last count, 2026-09-05), the machine form of `return-types.mdc`. Group them by project and file them as mechanical cleanup tasks; do not try to clear them all in one plan.

   ```bash
   pnpm nx run-many --target=lint --all --output-style=static 2>&1 | grep -E 'warning' | sort | uniq -c | sort -rn
   ```

3. **Read for the lint-invisible rules.** Grep plus read for the honor-system list above: `.then()` chains, `let` that is never reassigned, `&` intersections of object types, `x?: T` on values that are always supplied, object types with no `readonly`, `throw`s whose only consumer is a caller's `try`/`catch`, missing `@public` on package exports, deep package imports, non-kebab-case file names. Confirm each hit by reading the surrounding code — some are genuinely justified; say so rather than filing them.

   **Rules that used to be on this list and no longer belong on it.** Each is enforced by ESLint at `error` (or by a compiler flag), so a clean run _is_ proof and hand-hunting is wasted effort: `as` casts (`consistent-type-assertions`, `assertionStyle: 'never'`), `any` (`no-explicit-any`), new `enum` declarations (`no-restricted-syntax`), `import type` (`consistent-type-imports`), named exports (`import-x/no-default-export`), alphabetization (the sort-keys trio), and unchecked indexed access (`noUncheckedIndexedAccess`).

   This list shrinks over time — that is the point. **Before treating any rule as lint-invisible, check its label in `code-style.md`.** A previous version of this job insisted that `as` casts had to be found by reading because "the root ESLint config forces `consistent-type-assertions` to `off`". That was false: `tools/dotfiles/src/index.ts` sets it to `['error', { assertionStyle: 'never' }]`, in exactly one place. The job spent weeks hand-reading code for something CI had already blocked.

4. **Component/data boundaries.** Component files exporting non-component values; list or copy data defined inline instead of in the nearest `data/` folder; missing generated section comments. Mostly covered by step 1's audit — read only for what the audit cannot see, such as copy inlined as a JSX literal.
5. **Test conventions.** `screen` instead of `component`; `fireEvent` instead of `userEvent`; assertions against duplicated copy literals; React Router apps re-adding shims that the shared `setupReactRouterTest` setup already provides.
6. **Import hygiene.** Deep package imports (`@openthrottle/x/src/y`) instead of the main entry; missing `@public` tags on public API exports.
7. **Scope the sweep to recent code first.** Prioritize files changed in the last 60 days (`git log --since='60 days ago' --name-only`). Old violations matter less than new ones — new ones are the precedent problem.

## Ranking

Order findings by how much future wrongness they cause, and by how cheaply they can be fixed:

1. Violations in code written in the last 30 days — this is the precedent that spreads.
2. Type-modelling violations in typed boundaries (resolvers, loaders, package public API): bags of optionals that should be discriminated unions, `x?: T` on always-supplied values, missing `readonly`. These are the ones that let real bugs through, and the ones no linter will ever find.
3. `throw`s that should be result types, in code the caller has to wrap in `try`/`catch`.
4. Component-shape and route-shape audit violations.
5. Component/data boundary violations and missing section comments.
6. Test-convention violations.
7. `explicit-module-boundary-types` warnings from step 2 — high volume, purely mechanical.
8. Everything else mechanical and cosmetic: `let`→`const`, `.then()`→`async`/`await`, `&`→`interface extends`, file renames.

Cap the run at **15 findings, grouped by rule** — one task per rule listing every file that violates it, so each task is a single mechanical pass a cheap model can execute. If you find more, keep the top 15 and say in the plan description how many you dropped.

## Hard rules

- **Read-only on source code.** Never edit, fix, or refactor anything — not even a one-character `let`→`const`. Filing the finding is the job.
- **Never run `lint --fix`** in this job — it is read-only on source, and `--fix` is an edit. (It is also known to strip existing `consistent-type-assertions` disable comments, which silently makes the codebase worse.)
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

Dedupe is not finished when you have checked for a duplicate _plan_. Three rules that apply every run:

- **Compare against the existing plan's tasks, not just its title.** When an open plan from this job exists, call `get_tasks_by_plan_id` on it and check each finding against the tasks already there, matching on the finding's subject (the file path plus the rule it violates). File a task only for a subject no existing task covers. A run that re-files a finding the plan already carries has duplicated it, even though it opened no second plan.
- **Never file a task that contradicts an existing one.** If this sweep reaches a different verdict on a subject an existing task already covers, do not file an opposing task alongside it. Append the disagreement and your evidence to that task's description with `update_task`, so a human resolves one task instead of discovering the conflict halfway through executing the plan.
- **Say so when dedupe is degraded.** If `semantic_search` returns nothing for every query you try, treat the index as unavailable rather than as proof that no duplicate exists, and state that plainly in the plan description. "No duplicates found" and "I could not check for duplicates" must never look the same to whoever reads the plan.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Rules conformance: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `tooling`.
- **Description:** how the sweep was run, which rules were checked by audit versus by reading, how many findings were dropped by the cap, and anything skipped as a duplicate or judged a justified exception.
- **Tasks:** one per rule, ordered by the ranking above, each fully self-contained:
  - the rule, quoted from its section of `docs/monorepo/code-style.md`, with the section link and its enforcement label,
  - every violating file with line numbers,
  - the mechanical transformation to apply, and any listed file that is a deliberate exception,
  - explicit acceptance criteria, including that `lint`, `typecheck`, and `test` stay green for the touched projects and the relevant `audit:*` target gets quieter.

If nothing material is found, **file nothing** and say so plainly in your final message. An empty run is a valid outcome; a padded plan is not.
