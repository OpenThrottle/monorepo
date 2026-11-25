# Machine checks: run them, don't read for them

The checks that already cover a rule, so a review reads the diff only for what they cannot see. The judgment entries are in [catalog.md](catalog.md); every warned or advisory output below has an entry there. Each row says which part of a diff should trigger it, so run the rows that match the diff and skip the rest.

Fastest first. `pnpm exec eslint <path>` covers one file; `pnpm nx run <project>:lint` and `:typecheck` cover a project; `pnpm run check:local` runs the whole gate. ESLint exits 0 on warnings, so read the output.

## Scoping output to the diff

- Run `pnpm exec eslint <changed files>`, not `pnpm nx run <project>:lint`: a cached Nx run replays its output through `--output-style=static`, which hides the warnings.
- Repo-wide audits (`audit:templates-compliance`, `audit:test-coverage`, `pnpm nx run monorepo:knip`) scan the whole tree. Grep their output for the diff's paths and ignore the rest.
- Drop a warning on a line the diff did not add (`git blame`, or the hunk ranges of `git diff -U0`). Legacy code the diff does not touch is not a finding.
- A cached Nx log can print another worktree's absolute paths. Match on the repo-relative path (`packages/foo/src/bar.ts`), never the absolute prefix.
- Known false positive: `audit:templates-compliance` flags a `.tsx` file that has no JSX (a resource route, for example) as missing the React import. A file with no JSX needs no `React` import.

## Already machine-checked — run it, don't read for it

- **No new `enum`** — Mechanism: `no-restricted-syntax` (`TSEnumDeclaration`). Run: `pnpm exec eslint <changed files>`. Run when the diff touches: any `.ts` or `.tsx` file.
- **No non-erasable TS (parameter properties, `namespace`, `import x = require()`)** — Mechanism: `erasableSyntaxOnly`, `TS1294` (the decorated NestJS tier opts out). Run: `pnpm nx run <project>:typecheck`. Run when the diff touches: any `.ts` or `.tsx` file.
- **No `as` casts, no `any`** — Mechanism: `consistent-type-assertions` (`never`), `no-explicit-any`. Run: lint. Run when the diff touches: any `.ts` or `.tsx` file.
- **`cn` not `clsx`, no template-literal `className`** — Mechanism: `no-restricted-imports`, `no-restricted-syntax`. Run: lint. Run when the diff touches: any `.tsx` file.
- **`<SelectValue>` children** — Mechanism: `openthrottle/select-value-children`. Run: lint. Run when the diff touches: `.tsx` that uses `Select`.
- **Top-level `import type`** — Mechanism: `consistent-type-imports`, `import-x/consistent-type-specifier-style`. Run: lint (`--fix`). Run when the diff touches: any `.ts` or `.tsx` file.
- **No default exports** — Mechanism: `import-x/no-default-export`. Run: lint. Run when the diff touches: any `.ts` or `.tsx` file (framework carve-outs are in the config).
- **`.ts` extensions on relative imports (ESM + nodenext packages)** — Mechanism: `import-x/extensions` via `nodeEsmEslintConfig`; `TS2835`. Run: lint (`--fix`), typecheck. Run when the diff touches: `.ts` files in a nodenext package (not `react-router-*`, not CommonJS).
- **Alphabetized keys, interface members, enums, GraphQL selections** — Mechanism: `sort-keys`, `perfectionist/sort-interfaces`, `perfectionist/sort-enums`, `@graphql-eslint/alphabetize`. Run: lint. Run when the diff touches: any `.ts` or `.tsx` file or a `.graphql` document.
- **Import and export order** — Mechanism: `simple-import-sort/*`, `error` in the resolved config (`code-style.md` still labels it Warned; trust the config). Run: lint (`--fix`). Run when the diff touches: any `.ts` or `.tsx` file.
- **`const` over `let`, no `var`** — Mechanism: `prefer-const`, `no-var` (`error`, from the recommended sets, checked with `eslint --print-config`; `code-style.md` still labels these Honor system). Run: lint. Run when the diff touches: any `.ts` or `.tsx` file.
- **Indexed access is `T | undefined`** — Mechanism: `noUncheckedIndexedAccess`. Run: typecheck. Run when the diff touches: any `.ts` or `.tsx` file.
- **GraphQL data typed by `*Fragment`, not indexed or aliased `*Query` types** — Mechanism: `openthrottle/prefer-graphql-fragment` (`warn` in projects not yet clean). Run: lint. Run when the diff touches: `.ts` or `.tsx` that imports `__generated__`, or a `.graphql` document.
- **No `await` in a loop** — Mechanism: `no-await-in-loop`. Run: lint. Run when the diff touches: any `.ts` or `.tsx` file.
- **Test queries and events: `component` not `screen`, `userEvent` not `fireEvent`; no sleeps, wall clock or per-test timeouts; `.skip` needs an issue; retries pinned to 0** — Mechanism: `openthrottle/no-screen`, `no-fire-event`, `no-test-sleep`, `no-wall-clock-in-tests`, `no-per-test-timeout`, `skip-requires-issue`. Run: lint. Run when the diff touches: any `*.test.ts` or `*.test.tsx` file.
- **Test suffix is `.test`, placed in a sibling `__tests__/` (NestJS tier and project-root `tests/` exempt)** — Mechanism: `monorepo:check-test-file-names`. Run: `pnpm run check:local:test-file-names`. Run when the diff touches: any new or renamed test file.
- **Agent-safety chokepoints (MCP tool registration, agent CLI spawn, eslint-disable needs a reason)** — Mechanism: `openthrottle/mcp-tool-registration`, `agent-cli-spawn-chokepoint`, `disable-requires-reason`. Run: lint. Run when the diff touches: any `.ts` or `.tsx` file, or any `eslint-disable` comment.
- **Identifier casing (camelCase, PascalCase, ALL_CAPS, `T`-prefixed type parameters)** — Mechanism: `@typescript-eslint/naming-convention`. Run: lint. Run when the diff touches: any `.ts` or `.tsx` file.
- **File name takes its single export's casing (PascalCase component, camelCase function, kebab-case bucket)** — Mechanism: `scripts/audit-file-name-casing.ts`; fix with `tsx ./scripts/codemod-file-name-casing.ts --project=<dir> --write`. Run: `pnpm run audit:file-name-casing:strict`. Run when the diff touches: any new or renamed file.
- **NestJS files are `<folder>.<kind>.ts` and export only their kind** — Mechanism: `openthrottle/nestjs-file-naming`, `nestjs-file-exports`. Run: lint. Run when the diff touches: `src/**/*.<kind>.ts` in a `technology:nestjs` project.
- **`data/` files are kebab-case `<name>.ts` and hold only data** — Mechanism: `openthrottle/data-file-shape`. Run: lint. Run when the diff touches: `**/data/**` in a React Router app or `react-router-*` package.
- **Named functions use block bodies; ternary at most three lines; long strings are template literals** — Mechanism: `openthrottle/named-function-block-body`, `three-line-ternary`, `long-string-template-literal`. Run: lint (`--fix` where autofixable). Run when the diff touches: any `.ts` or `.tsx` file.
- **Component shape: one component per file, exports, six markers, 210-line cap, JSX consts under `// Markup`, hoisted helpers and data** — Mechanism: `openthrottle/component-primitive-shape`, `max-lines`; `scripts/audit-component-shape.ts` gates R4 (hoist), R5 (one component), R6 (cap); R7 (hook-extraction signals) is advisory. Run: `pnpm run audit:component-shape:strict`, `pnpm run audit:component-shape:shadcn:strict` (shadcn cap is report-only). Run when the diff touches: `**/components/**` (the shadcn variant for `packages/react-router-shadcn`).
- **Hook shape: one `use*` per file in `hooks/`, exports, no module-scope values, markers, return type** — Mechanism: `openthrottle/hook-primitive-shape`; `scripts/audit-hook-shape.ts` adds the camelCase file name, the `hooks/` folder and cross-file module-scope use. Run: `pnpm run audit:hook-shape:strict`. Run when the diff touches: `**/hooks/**`, or any file named `use*`.
- **Route shape: only React Router exports, no module-scope helpers, markers** — Mechanism: `openthrottle/route-primitive-shape` (`warn`); `scripts/audit-route-shape.ts` gates R1 (exports) and R3 (hoist) in CI. Run: `pnpm run audit:route-shape:strict`. Run when the diff touches: `applications/*/app/routes/**`.
- **`sideEffects` declared and true** — Mechanism: `monorepo:check-side-effects` (`pnpm exec tsx scripts/check-side-effects.ts` prints the value). Run: `pnpm run check:local:side-effects`. Run when the diff touches: any `package.json`, or a new module that does work on evaluation.
- **No junk-drawer folder names (`lib`, `helpers`, `common`, `shared`, `misc`)** — Mechanism: `monorepo:check-folder-vocabulary` (also run on staged paths by the commit hook). Run: `pnpm run check:local:folder-vocabulary`. Run when the diff touches: any new or renamed folder.
- **Top-level `src/` folders inside their bucket's vocabulary** (packages and tools tagged nodejs, react or react-router; `__tests__` and `__generated__` always allowed) — Mechanism: the same `monorepo:check-folder-vocabulary`, keyed on each project's `technology:` tags; folders that predate it are listed in its shrink-only `GRANDFATHERED_FOLDERS`. Run: `pnpm run check:local:folder-vocabulary`. Run when the diff touches: a new folder directly under a package's `src/`.
- **Only `docs`, `fixtures`, `scripts`, `src` and `tests` at a checked project's root** (code and data beside `src/` escape the vocabulary; the list is `PROJECT_ROOT_FOLDERS` in `@tools/generators`) — Mechanism: the same `monorepo:check-folder-vocabulary`. Run: `pnpm run check:local:folder-vocabulary`. Run when the diff touches: a new folder directly under a package's root.
- **Vocabulary folders stay flat one level down** (no `src/utils/<feature>/`, `src/data/<feature>/`; only `__tests__`, `__generated__` and, in the react buckets, a PascalCase compound-component folder under `components/`) — Mechanism: the same `monorepo:check-folder-vocabulary`; nested folders share the shrink-only `GRANDFATHERED_FOLDERS`, which holds none. Run: `pnpm run check:local:folder-vocabulary`. Run when the diff touches: a new folder below a package's `src/<vocabulary>/`.
- **Module boundaries by tag (`type:`, `production:`), tag validity** — Mechanism: `@nx/enforce-module-boundaries`, `scripts/nx-validate-tags.ts`. Run: lint, `pnpm nx:validate-tags`, `pnpm run nx:validate`. Run when the diff touches: an added cross-project import, or a project's `package.json` `nx` block or tags.
- **Package entrypoints: `exports` conditions into a build dir, `types` first and `default` last, live `build` and `dev` targets on every `technology:nestjs` package** — Mechanism: `scripts/check-package-entrypoints.ts`. Run: `pnpm run check:local:package-entrypoints`. Run when the diff touches: `packages/*/package.json` (`exports`, `main`, `types`, targets).
- **Node builtins reaching a browser bundle** — Mechanism: `clientNodeBoundary` Vite plugin, the `check-client-boundary` target (depends on `build`; lint and typecheck pass when this is broken). Run: `pnpm nx run <app>:check-client-boundary` (or `pnpm run check:local:client-boundary` for every affected app). Run when the diff touches: browser app code, or a package barrel a React Router app imports.
- **Phantom dependencies: imported workspace or third-party package not declared in the project's own `package.json`** — Mechanism: `scripts/audit-workspace-deps.ts`. Run: `pnpm run audit:workspace-deps:strict`, `pnpm run audit:third-party-deps:strict`. Run when the diff touches: `package.json`, or any new import of another package.
- **Circular dependencies** — Mechanism: `scripts/nx-circular-dependencies.ts`. Run: `pnpm run check:local:circular-deps`. Run when the diff touches: an added cross-project import.
- **tsconfig project-reference drift (`applications/*` to `applications/*` is always wrong)** — Mechanism: `nx sync:check`. Run: `pnpm nx sync:check` (`pnpm nx sync` fixes it). Run when the diff touches: `tsconfig*.json`, or an added cross-project import.
- **Catalog coverage** — Mechanism: `scripts/check-catalog-coverage.ts`. Run: `pnpm run check:catalog`. Run when the diff touches: `package.json`, `pnpm-workspace.yaml`.
- **Lockfile fixed point** — Mechanism: `monorepo:check-lockfile`. Run: `pnpm run check:local:lockfile`. Run when the diff touches: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.
- **Fan-out and generated trees in sync (skills, per-tool agent config, generated-file attributes)** — Mechanism: `check-agent-assets-ssot`, `check-agent-config-parity`, `check-generated-attributes`. Run: `pnpm run check:local:agent-assets`, `pnpm run check:local:agent-config-parity`, `pnpm run check:local:generated-attributes`. Run when the diff touches: `skills/**`, `.agents/**`, `.claude/**`, `.cursor/**`, or a committed generator payload.
- **No agent attribution in commits** — Mechanism: `skills/github-pull-request/scripts/check-attribution.sh` (commit-msg, pre-push, CI). Run: `bash skills/github-pull-request/scripts/check-attribution.sh` (modes `--message-file <f>`, `--title-file <f>`, `--body-file <f|->`). Run when the diff touches: a commit message, PR title or PR body.

## Warned or advisory

Nothing blocks these, so a human has to read the output. All of them also have catalog entries.

- **`openthrottle/pre-hooks-unpack` (`warn`, components and routes)** — Run: lint Run when the diff touches: `.tsx` under `components/` or `app/routes/`. Catalog entry: `exemplar-04`
- **`@typescript-eslint/explicit-module-boundary-types` (`warn`)** — Run: lint Run when the diff touches: any `.ts` or `.tsx` file. Catalog entry: `exemplar-05`
- **`openthrottle/route-primitive-shape`, route `max-lines` (`warn`)** — Run: lint Run when the diff touches: `applications/*/app/routes/**`. Catalog entry: `exemplar-06`
- **`.tsx` drift from generator templates (default export in a component path, missing React import)** — Run: `pnpm run audit:templates-compliance` Run when the diff touches: a new `.tsx` under `applications/*/app/` or `packages/*/src/`. Catalog entry: `exemplar-03`
- **Files with no real spec (generator stub specs count as untested)** — Run: `pnpm run audit:test-coverage` Run when the diff touches: a new component, hook, util or route. Catalog entry: `exemplar-08`
- **Dead exports and missing `@public` tags (report only, never `--fix`)** — Run: `pnpm nx run monorepo:knip` Run when the diff touches: a new or removed export, or a package's public API. Catalog entry: `human-07`

## Coverage of `Job_RulesConformance` honor-system scope

Every bullet of that job's "This job's actual scope" list maps to at least one entry, so the job can point here.

- Discriminated unions: `human-01`
- `interface extends` over `&`: `human-02`
- `readonly` properties: `human-03`
- Optional properties: `human-04`
- Prefer results over throwing: `human-05`
- JSDoc and `@public`: `human-06`, `human-07`, `human-16`
- File names: machine-checked (file-name casing audit), `naming-01` to `naming-04` for names the audit cannot judge
- General (`const`, `async`/`await`, React import): `human-08`, `human-09`, `exemplar-03`
- Installing libraries: `bound-09`
- Where code goes (deep imports): `bound-01`, `bound-02`
- Frontend design: `dup-04`, `dup-05`, `dup-06`
- Testing: `place-08`, `human-13` to `human-15`, `dup-07`, `dup-08`, `dup-10` (`screen` and `fireEvent` are lint errors)
- Generators first: `exemplar-01`, `exemplar-02`, `exemplar-09`
- Component and route shape audits; `warn` lint output: machine-checked table; `exemplar-04` to `exemplar-06`

## Excluded

Honor-system rules deliberately left out of the catalog, with the reason.

- **Never pick a library version from memory**: The choice is invisible in a diff. Its visible symptoms (hand-typed version, no lockfile change, uncataloged dependency) are `bound-09`, and `check:catalog` plus `check:local:lockfile` run the check.
- **Plans live in OpenThrottle only; follow-ups are OT plans**: Workflow, not diff content. A plan written as Markdown is caught by the `ot-plans` skill and review, not by a code-shape pass.
- **Never push to `main`, no `--no-verify`, human confirmation before rebase**: Actions, not code. Husky and branch protection own them. Commit-message attribution is enforced by `check-attribution.sh`.
- **Conventional commits and the PR template**: Machine-checked by commitlint and the PR template; not a property of the diff.
- **Server, GraphQL and NestJS conventions (resolver return types, deprecate-never-remove schema changes, entity and service testing)**: Owned by [`ot-stack`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-stack/SKILL.md); schema removals are caught by `check-graphql-breaking-changes` and `check:local:graphql-schema`. Review those with that skill.
- **`explicit-function-return-type` on every function**: Deliberately `off`; only module boundaries are warned (`exemplar-05`). Flagging inner functions would contradict the config.
- **Existing enums, re-export-only barrels and `utils.<x>.ts` files**: Grandfathered or legacy; a diff that does not touch them is not a finding. Only new instances are (`place-09`, `naming-01`).
- **Cross-agent parity of MCP sets and permissions**: Machine-checked by `check:local:agent-config-parity`; the hand-edit symptom is `place-11`.
