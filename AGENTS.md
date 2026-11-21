<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding with **`@tools/generators`** (`react-router`, `nestjs`, `react`, `package`, `folders`), ALWAYS invoke **`ot-generators`** FIRST — before MCP tools. See [`skills/ot-generators/SKILL.md`](./skills/ot-generators/SKILL.md) (`NX_ISOLATE_PLUGINS=false`, `pnpm nx`, comma-separated `--name` batching, AGENT_USAGE).
- For other scaffolding (apps/libs via Nx plugins, project structure, setup not covered by `@tools/generators`), read `nx_docs` or the plugin's own docs — there is no generic generator skill.

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- **`ot-generators`** covers `@tools/generators` discovery and flags — don't call nx_docs just to look up routine generator syntax

<!-- nx configuration end-->

## Per-project AGENTS.md

Agent context is layered in three tiers, and **each file states only what its parent tier does not** (the delta rule):

1. **This file + [CLAUDE.md](./CLAUDE.md)** — monorepo-wide conventions (Nx, pnpm-only, generators-first, OT plans, GraphQL codegen flow, code style, agent-asset SSOT).
2. **Area files** — [`applications/AGENTS.md`](./applications/AGENTS.md), [`packages/AGENTS.md`](./packages/AGENTS.md), [`tools/AGENTS.md`](./tools/AGENTS.md), [`databases/AGENTS.md`](./databases/AGENTS.md) — facts shared across one family (e.g. the source-first/no-build pattern, React Router app conventions, migration rules).
3. **Per-project `AGENTS.md`** — one per Nx project, carrying only that project's deltas: non-obvious commands, key paths, invariants/gotchas that break PRs, and boundaries.

When working inside a project, read its own `AGENTS.md` first, then its area file, then this file. When adding context, put it at the **most general tier that fully owns it** and link rather than duplicate downward; never restate a parent tier or the project's own `README.md`. There is no per-project `CLAUDE.md` — Claude Code and Cursor both read nested `AGENTS.md` natively.

## Agent and editor folders

For **where** agent- and editor-specific config lives (`.cursor/`, `.claude/`, `.agents/`, `skills/`, duplication strategy, where to edit for common tasks), see [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md). **This file** covers cross-editor handbook topics (Nx, OT, workflow CLI); **that doc** covers physical layout and canonical ownership.

**Cross-agent parity:** we aim to support all our agents/drivers across the board (MCP servers and tracked permissions) and keep them consistent. A change to one tool's MCP set or permission policy lands for every tool in the same PR, or the gap is recorded; edit [`.agents/agent-config.json`](./.agents/agent-config.json), never the per-tool files ([design](docs/monorepo/agent-config-parity.md), [matrix](docs/monorepo/agent-editor-folders.md#7-cross-agent-parity)).

### Git worktrees (tool-agnostic)

Worktrees are handled by the portable [`ot-worktree`](skills/ot-worktree/SKILL.md) skill: `pnpm worktree:new <name>`, `pnpm worktree:heal` and `pnpm worktree:remove <name>` (the Claude `WorktreeCreate` hook and Cursor use the same scripts; a plain `git worktree add` self-heals on first `:dev`). Load the skill for the root ladder, base-branch rules and `destroy` safety defaults.

A worktree runs its own stack: `pnpm worktree:serve <server|developer>`; it shares the primary's database, so a branch that adds migrations needs `pnpm worktree:db isolate` (or `worktree:new <name> --own-db`). Model, marker and guard: [docs/monorepo/worktree-port-allocation.md](docs/monorepo/worktree-port-allocation.md).

### Contributor workflow (skills, personas, prompts)

| Action                       | Path                                                                                | Notes                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Write** skills             | [`skills/<slug>/SKILL.md`](./skills/)                                               | OT-owned skills are hand-authored here (SSOT). Install external ones 1:1: `npx skills add <owner>/<repo> --skill <name> --agent universal`. **Never** hand-edit `.agents/skills/` or `<agent>/skills/` — generated by ot-skill-sync. Policy + tracking: [docs/Skills.md](./docs/Skills.md).               |
| **Write** code style         | [docs/monorepo/code-style.md](docs/monorepo/code-style.md) + this file § Code style | The always-on statement is § Code style above; the doc holds rationale and examples. The per-editor rules tree these replaced is retired — there is no `.mdc` layer any more.                                                                                                                             |
| **Write** personas / prompts | `.agents/personas/`, `.agents/prompts/`                                             | Git is the write authority; `pnpm run database:import-agent-assets` copies them into `custom_prompts` (README and `_template.md` are skipped). Personas are consumed today only by Ralph `--prompt-file` and by attaching the file by hand: [`.agents/personas/README.md`](./.agents/personas/README.md). |
| **Validate locally**         | `pnpm nx run monorepo:check-agent-assets-ssot`                                      | Runs ot-skill-sync `sync.sh --check` (skill layout). Run `bash skills/ot-skill-sync/scripts/sync.sh` first to fix skill drift.                                                                                                                                                                            |
| **DB index (read-only)**     | `custom_prompts` via GraphQL                                                        | Git is write authority; `pnpm run database:import-agent-assets` refreshes it from disk — do not edit prompts in the DB.                                                                                                                                                                                   |

**Prompt filename prefixes** (`.agents/prompts/`, no frontmatter — slug derives from the filename): `Before_*` / `After_*` are **lifecycle hooks** injected around a run; `Job_*` are **standalone scheduled runs** (recurring audits invoked via Ralph `--prompt-file` or an OT scheduled job) that are read-only on source and file their findings as a single OpenThrottle plan. Details: [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md).

**Editor-native (not generated from an in-repo SSOT):** `.cursor/hooks.json`, `.cursor/mcp.json` (from `mcp.json`), `.cursor/worktrees.json`, `.cursor/settings.json`. See [CONTRIBUTING.md](./CONTRIBUTING.md) § Agent assets. Older Nx Console releases write a generated Nx rule file to `.cursor/rules/nx-rules.mdc`; current ones only delete it as a legacy file or offer to migrate it to agent skills. That one path is gitignored, so it never shows up in `git status`.

## OpenThrottle Agent Skills

OT-owned skills are authored under [`skills/`](./skills/) and surfaced to every tool via the generated `.agents/skills/` view ([ot-skill-sync](./skills/ot-skill-sync/SKILL.md)). Each skill’s YAML `description` lists **USE WHEN** triggers; prefer these for OpenThrottle-specific workflows alongside the generic Nx skill (**nx-workspace**) above. Full policy + installed set: [docs/Skills.md](./docs/Skills.md).

- **ot-generators** — `@tools/generators`, `NX_ISOLATE_PLUGINS=false`, `pnpm nx`, AGENT_USAGE alignment: [`skills/ot-generators/SKILL.md`](./skills/ot-generators/SKILL.md)
- **ot-stack** — openthrottle-server GraphQL, databases/embeddings, openthrottle-developer UI, openthrottle-mcp package: [`skills/ot-stack/SKILL.md`](./skills/ot-stack/SKILL.md)
- **ot-postgres** — SQL migrations, `COMMENT ON TABLE` / column comments, idempotent DDL in `databases/<db>/migrations/` (`openthrottle`, `cms`): [`skills/ot-postgres/SKILL.md`](./skills/ot-postgres/SKILL.md)
- **ot-plans** — openthrottle-mcp, plans/tasks, `Plan-Id` / `Task-Id`, post-merge work-ledger commit recording: [`skills/ot-plans/SKILL.md`](./skills/ot-plans/SKILL.md)
- **agents-ralph** — the Ralph loop prompt: one task at a time, status sync, commit cadence: [`skills/agents-ralph/SKILL.md`](./skills/agents-ralph/SKILL.md)
- **github-commit** — conventional commits, staging, `Plan-Id` / `Task-Id` footers: [`skills/github-commit/SKILL.md`](./skills/github-commit/SKILL.md)
- **ot-skill-guide** — authoring and reviewing skills against the agentskills.io spec: [`skills/ot-skill-guide/SKILL.md`](./skills/ot-skill-guide/SKILL.md)
- For the Ralph **CLI**, queue spawn vs orchestrator, and BullMQ wiring there is no skill — read [`tools/workflows/README.md`](./tools/workflows/README.md).

## Workflow CLI (@tools/workflows)

- **Discoverability:** Run `pnpm exec workflow-ralph --help` (and other bins) for usage. See `tools/workflows/README.md` for bin list.
- **Run:** `pnpm exec workflow-ralph --plan <openthrottle-plan-uuid>` (or `--task <openthrottle-task-uuid>` for task-centric). OpenThrottle (OT) required; see `tools/workflows/README.md`. Optional defaults: `.workflow-ralph.json` (see `.workflow-ralph.json.example`, `docs/workflows/ralph-config-migration.md`).
- **Two runners (Ralph vs OT Loop):** the Plans queue has a second runner, **OT Loop** — the headless implementation of `skills/ot-loop/SKILL.md` § The loop (`packages/openthrottle-agentic-loop`, wired in `applications/openthrottle-server/src/queues/ot-loop/`; design: [`docs/workflows/ot-loop-job.md`](docs/workflows/ot-loop-job.md)). Selected per plan by `runConfigJson.runner` (`'ralph'` | `'ot-loop'`; absent = Ralph, the default). **`/agents-ralph` is used only by the Ralph runner and the `workflow-ralph` CLI**, until a follow-up plan retires them; OT Loop feeds a driver CLI a standalone prompt and never uses it. OT Loop validation is job-owned, configured per repo in `.openthrottle/ot-loop.json`.
- **API queue (spawn vs orchestrator):** `enqueuePlanRun` runs nested `workflow-ralph` in the worker; `enqueuePlanRalphOrchestrator` runs the in-process GraphQL Ralph orchestrator (no child CLI). See `tools/workflows/README.md` § Worktree + BullMQ workflow. Docker, worker cwd, and compose follow-ups: investigation plan `677b6849-1912-4fa8-a5f6-d8233f2cdf97`.
- **Commit as you go, push once per plan:** When running Ralph (or working with OT plans/tasks), **commit after each task** — conventional commits, with `Plan-Id` and `Task-Id` in the body or footer (traceability is non-negotiable) — but **push once per plan, not once per task**. Every push to a branch with a ready PR triggers a full CI run, so an N-task plan used to cost N CI runs of a branch nobody was reviewing yet; batching gives the same total validation over one run. Keep the PR in **draft** until the last task is `COMPLETED`, then `gh pr ready`. Push mid-plan only when you genuinely need to (handing off, or a worktree at risk of being reaped). See [docs/monorepo/ci-cost.md](docs/monorepo/ci-cost.md). If `main` uses a merge queue, `gh pr merge --auto` only enqueues: confirm `gh pr view <n> --json mergedAt,mergeCommit` shows `mergedAt` before calling a PR merged. Ledger artifacts come from `settle_plan_run` at PR open and the server reconciles them to the landed squash; there is no post-merge step (see the `ot-plans` skill § Work ledger).

## Code style

**This section is the normative statement — one line per rule.** Rationale, code examples and the enforcement mechanism for each live in [docs/monorepo/code-style.md](docs/monorepo/code-style.md); open it when a line here is not enough. Together they replace the retired per-editor `.mdc` rules tree, which was Cursor-specific and covered fewer surfaces than these two files do.

The rules are grouped by **who catches you**. The honor-system ones lead, because they are the reason this section exists: nothing will stop you breaking them.

### Honor system — no machine check exists

- **Model variant shapes as discriminated unions**, not a bag of optionals. A `status` field alongside optional `data`/`error` permits states the system can never be in. [↳](docs/monorepo/code-style.md#discriminated-unions)
- **`interface extends`, never `&`**, when modelling inheritance — the intersection operator has bad checker performance. [↳](docs/monorepo/code-style.md#interface-extends-over-)
- **`readonly` on object type properties by default**; omit it only when the property is genuinely mutable. [↳](docs/monorepo/code-style.md#readonly-properties)
- **Optional properties extremely sparingly.** Prefer `userId: string | undefined` over `userId?: string`, so a caller cannot silently forget it. [↳](docs/monorepo/code-style.md#optional-properties)
- **Return a result type instead of throwing** wherever the caller would need a manual `try`/`catch`. Throw only where the throw itself is the desired system behavior (e.g. inside a request handler). [↳](docs/monorepo/code-style.md#prefer-results-over-throwing)
- **JSDoc only when the behavior is not self-evident**, behind an inline `@description` tag, with `@link` for same-file references. Exports that are package public API need a `@public` tag so Knip keeps them. [↳](docs/monorepo/code-style.md#jsdoc-comments)
- **Never pick a library version from memory** — run `pnpm add -D <pkg> -w` and let the resolver decide. [↳](docs/monorepo/code-style.md#installing-libraries)
- **`const` over `let`; never `var`. `async`/`await` over `.then()`. `import * as React from 'react';`** [↳](docs/monorepo/code-style.md#general)
- **We write code for humans.** The compiler and minifier make it concise, so the source does not have to. "Data files hold only data", "Named functions use block bodies", "A ternary takes at most three lines", "Long string values are template literals" and "JSX held in a `const` goes under `// Markup`" under Enforced are the readability conventions from the PR #622 review (OT plan `a8cb40e5`), all at `error`. [↳](docs/monorepo/code-style.md#readability)
- **Generators first.** Before hand-writing a component, route, service or package, check `@tools/generators` via the [`ot-generators`](./skills/ot-generators/SKILL.md) skill; every invocation needs `NX_ISOLATE_PLUGINS=false`. A component in a **package** is a different generator from one in an **application**. If no generator fits, say so explicitly before writing custom code. [↳](docs/monorepo/code-style.md#generators)
- **No deep package imports** — import a package's main entry only, and re-export from its `index.ts`.
- **UI comes from `@openthrottle/react-router-shadcn`** (source: `packages/react-router-shadcn/src/components`). A missing primitive gets added to that package, never inlined in an app. Style with the existing Tailwind + shadcn tokens; do not hardcode raw colors or spacing. [↳](docs/monorepo/code-style.md#frontend-design)
- **Per-row table actions use `GlobalPopover`** + `GlobalPopoverActionsHeader` from `@openthrottle/react-router-ui-global` — never a hand-rolled `DropdownMenu` overflow. Bulk and toolbar bars are a different surface. [↳](docs/monorepo/code-style.md#frontend-design)
- **Prefer a bucket module over a file per function.** Sibling functions that share a subject go in one kebab-case module named for it (`formatDate`, `formatDuration` → `format.ts`); only a function with no natural sibling keeps its own file. Never bucket classes, components, hooks, ESLint rules or NestJS files. [↳](docs/monorepo/code-style.md#naming-conventions)
- **A test is named for the file it tests and lives in a sibling `__tests__/`** — `utils/format.ts` → `utils/__tests__/format.test.ts`, never colocated (the NestJS tier is the exception: `<folder>.<kind>.test.ts` sits beside its file). Only a suite spanning several files takes a descriptive name. The `*.test.*` suffix itself is enforced — `monorepo:check-test-file-names` fails on any `*.spec.*` under `applications/`, `packages/` or `tools/`, and on any `*.test.*` colocated with source outside `__tests__/` (the NestJS tier and a project-root `tests/` suite folder are exempt). [↳](docs/monorepo/code-style.md#testing)
- **Tests use `waitFor` for async DOM**, one `describe` per `if` branch, plus edge cases. [↳](docs/monorepo/code-style.md#testing)
- **Assert behavior and structure, not copy** — roles, labels, `href`, test ids. When exact copy _is_ the contract, single-source it in the area's `data/data.copy.ts` and have both the component and the spec import that same constant. [↳](docs/monorepo/code-style.md#testing)

### Enforced — ESLint `error` or a compiler flag; CI fails

- **No new TypeScript enums** — use an `as const` object. Existing enums are grandfathered. [↳](docs/monorepo/code-style.md#no-new-enums)
- **No non-erasable TypeScript** — `erasableSyntaxOnly` in `tsconfig.base.json` rejects constructor parameter properties, `enum`, `namespace` and `import x = require()` with `TS1294`. Only the decorated (NestJS) tier opts out; a package whose `exports` name `./src/` never can, and also bans decorators through `sourceFirstEslintConfig`. Generated GraphQL clients used to force six more opt-outs and no longer do — codegen emits `as const` objects rather than `enum`. [↳](docs/monorepo/source-first-packages-and-strip-only.md)
- **No `as` casts** in any form (`x as T`, `<T>x`, `x as unknown as T`). Narrow with a runtime check, write a type predicate, or parse at the boundary. [↳](docs/monorepo/code-style.md#no-as-casts)
- **No `any`** anywhere, generic function bodies included. Use `unknown` + narrowing, a generic parameter, or an overload signature. [↳](docs/monorepo/code-style.md#no-any)
- **Compose classes with `cn`** from `@openthrottle/react-router-shadcn` — `clsx` imports (outside react-router-shadcn) and template-literal `className`s are lint errors. Pass the caller's `className` last. [↳](docs/monorepo/code-style.md#composing-classes-with-cn)
- **`import type` at the top level**, not inline `import { type … }`. Auto-fixable. [↳](docs/monorepo/code-style.md#import-type)
- **No default exports** outside the framework carve-outs already in the config. Hitting the rule in a new framework file means adding a glob with a note naming the consumer — not an inline disable. [↳](docs/monorepo/code-style.md#no-default-exports)
- **File extensions on relative imports in ESM + nodenext packages** — write `./foo.ts` and `tsc` ships `./foo.js`. Node's ESM resolver does no extension searching and `tsc` never invents a specifier it was not given, so this is `TS2835` at `typecheck` either way. Don't type them by hand: those packages spread `nodeEsmEslintConfig` and `eslint --fix` writes them. Does **not** apply to the `moduleResolution: bundler` tier (every `react-router-*`, resolved by Vite) or to CommonJS packages. Replacing this with a bundler was evaluated and rejected — [esm-import-extensions-and-bundlers.md](docs/monorepo/esm-import-extensions-and-bundlers.md) has the measurements.
- **Alphabetize object keys and interface members**, and GraphQL selection sets in `*.graphql` documents. Alphabetize arrays too when order carries no meaning (that half is honor system). Not the generated `schema.gql`, not NestJS decorator order. [↳](docs/monorepo/code-style.md#alphabetize-arrays-and-object-keys)
- **Indexed access yields `T | undefined`** — `noUncheckedIndexedAccess` is on. Handle it with a guard or a default; `!` and casts are not the answer. [↳](docs/monorepo/code-style.md#indexed-access-returns-undefined)
- **Type GraphQL data with generated `*Fragment` types**, never by indexed access into a generated `*Query` / `*Mutation` / `*Subscription` type (`XQuery['field']['items'][number]` or `XQuery['field']`). The fix is a `.graphql` fragment plus codegen. A project not yet clean spreads `preferGraphqlFragmentWarningsEslintConfig` last until it is. _(Enforced, via `openthrottle/prefer-graphql-fragment`.)_ [↳](docs/monorepo/code-style.md#graphql-data-uses-fragment-types)
- **No `await` inside a loop** — collect the promises and `Promise.all`. Deliberate sequencing is the one case for an inline disable _with a reason_. [↳](docs/monorepo/code-style.md#no-await-in-loops)
- **Tests query the render result (`component`), not `screen`, and use `userEvent`, not `fireEvent`** — `const component = render(...)`, then `component.getByRole(...)`. _(Enforced in test files via `openthrottle/no-screen` and `openthrottle/no-fire-event`.)_ [↳](docs/monorepo/code-style.md#anti-flake-test-rules)
- **camelCase** variables and functions, **PascalCase** types/classes/interfaces/components, **ALL_CAPS** constants, **`T`-prefixed** type parameters. [↳](docs/monorepo/code-style.md#naming-conventions)
- **NestJS files are `<folder>.<kind>.ts` and export only their kind** — a `.service.ts` is one `@Injectable()` class named for its folder, a second service in a folder gets a sub-folder, and every file states a kind. _(Enforced, via `openthrottle/nestjs-file-naming` + `openthrottle/nestjs-file-exports`.)_ [↳](docs/monorepo/code-style.md#nestjs-file-names)
- **`data/` files are `data.<name>.ts` and hold only data** — copy in `data.copy.ts`, fixtures in `mock.<name>.ts`; a `data/index.ts` barrel keeps its name. A function a data file would export belongs in the sibling `utils/`. _(Enforced, via `openthrottle/data-file-shape` in the React Router apps and `react-router-*` packages — each spreads `dataFolderEslintConfig`.)_ [↳](docs/monorepo/code-style.md#data-files-hold-data)
- **Named functions use block bodies** — `const f = (x) => { return …; };`, never a concise `=> expr`. "Named" means bound to a variable or class property; inline callbacks passed as arguments (`.map((row) => row.id)`, `onClick={() => …}`) are exempt. _(Enforced, via `openthrottle/named-function-block-body`; `eslint --fix` rewrites it.)_ [↳](docs/monorepo/code-style.md#named-functions-use-block-bodies)
- **A ternary takes at most three lines** — one line, or condition / `? …` / `: …` with the condition on the `=` line. Prettier pushes a binary condition (`a === b`, `a && b`) below the `=`, making four lines: name it (`const isFalse = …`) and the ternary starts on the `=` line. Past three lines (a wrapped chain, a branch that wraps), name the branches, extract a util, or use `if`/`else`. JSX conditionals are in scope — a branch that is a whole subtree goes in a `// Markup` const. _(Enforced, via `openthrottle/three-line-ternary`; no autofix — naming is a human call.)_ [↳](docs/monorepo/code-style.md#a-ternary-takes-at-most-three-lines)
- **Long string values are template literals**, so Prettier keeps them on the key's line instead of wrapping them onto their own. Short strings keep single quotes. _(Enforced, via `openthrottle/long-string-template-literal` — only a quoted string Prettier wrapped below its key or `=`; `eslint --fix` rewrites it.)_ [↳](docs/monorepo/code-style.md#long-strings-are-template-literals)
- **A file named for its single (or primary) export takes that export's casing** — PascalCase for a React component (`Button.tsx`), camelCase for a function (`getFormFieldKind.ts`), as hooks already do (`useFoo.ts`). A file named for one export that also exports its helpers or constants counts (`resolveSkillAvailability.ts`). **kebab-case for everything else**: a bucket module of several exports, scripts, config. NestJS `<folder>.<kind>.ts` and `data.<name>.ts` keep their own forms. _(Enforced everywhere except the NestJS tier and `tools/nx-plugins` by `audit:file-name-casing:strict`; ESLint cannot see file names.)_ [↳](docs/monorepo/code-style.md#naming-conventions)
- **Components export only their component + props.** Hardcoded data, lists, mocks and user-facing copy live in the nearest `data/` folder (`data.<name>.ts`; copy → `data.copy.ts`). Pure data files do not warrant their own spec. [↳](docs/monorepo/code-style.md#component-and-data-boundaries)
- **Keep the generated component shape** — the six ordered section markers (`// Hooks`, `// Setup`, `// Handlers`, `// Markup`, `// Life Cycle`, `// 🔌 Short Circuit`) even when a section is empty, one component per file, 210-line cap. [↳](docs/monorepo/code-style.md#route-and-component-shape)
- **JSX held in a `const` goes under `// Markup`**; `// 🔌 Short Circuit` holds only early `if (…) return …;` statements. _(Enforced in components via `openthrottle/component-primitive-shape`; route modules are not covered yet.)_ [↳](docs/monorepo/code-style.md#jsx-consts-live-under-markup)
- **Keep the generated hook shape** — one `use*` hook per file, named after the file and living in `hooks/`; export only the hook, its `Use<Name>Options` and its `Use<Name>Result`; no module-scope values (a value only the hook uses lives inside it, a shared one moves to `data/`, `config/` or `utils/`); the six markers; an explicit return type. [↳](docs/monorepo/hook-primitive-shape.md)
- **Unpack `props` before `// Hooks`** — the identity destructure and any nested identity destructures go in the pre-Hooks block, derived values under `// Setup`; never unpack after `// Hooks` or after Short Circuit. Same for route `Route.ComponentProps`. _(Warned.)_ [↳](docs/monorepo/code-style.md#route-and-component-shape)
- **Every project's `package.json` declares a truthful `sideEffects`** — `false` when no module does anything on evaluation, otherwise an array naming exactly the files that do (stylesheets as `**/*.css`; a built package lists the emitted `dist/` path too). Never `true`, never omitted. `pnpm exec tsx scripts/check-side-effects.ts` prints the value to set. _(Enforced, via `monorepo:check-side-effects` in CI and `check:local`.)_ [↳](docs/monorepo/code-style.md#sideeffects-is-declared-and-true)
- **Return types on module-boundary functions.** _(Warned, via `explicit-module-boundary-types`; the broader `explicit-function-return-type` is deliberately `off`.)_ [↳](docs/monorepo/code-style.md#return-types)

### Owned elsewhere

- **Server, GraphQL and NestJS conventions** — resolver return types (hand-written `@ObjectType()` classes and `*ListResult` envelopes — no `Result()` / `PaginatedResult()` / `ListResult()` factories exist), backwards-compatible schema changes (deprecate, never remove), entity and service testing: the [`ot-stack`](./skills/ot-stack/SKILL.md) skill.
- **Where files go and what they are named** — folder layout, application vs package, module-boundary tags, and the banned junk-drawer folder names (`lib`, `helpers`, `common`, `shared`, `misc`): the [`ot-folders`](./skills/ot-folders/SKILL.md) skill.
- **Package READMEs:** for `packages/**/README.md`, list **pnpm** first in install sections and use **`pnpm nx run <project>:<target>`** in Nx examples. Templates live under `tools/generators/src/generators/package/files/`; conventions are summarized in [CONTRIBUTING.md](./CONTRIBUTING.md) and the [`ot-generators`](./skills/ot-generators/SKILL.md) skill.
- **`nx sync` (TypeScript project references):** use `pnpm nx sync:check` to report drift (it also gates `check:local`) and `pnpm nx sync` to fix it, inspecting the diff before committing. The generator is deliberately **not** attached to the task pipeline, so `nx run`/`affected` never sync and never fail on drift. An `applications/*` → `applications/*` reference is always wrong. Full decision and measurements: [docs/monorepo/NX.md](docs/monorepo/NX.md#nx-sync--the-typescript-project-reference-sync).
- **Knip (dead code):** Run **`pnpm nx run monorepo:knip`** for reports only. Do **not** run `knip --fix` or `knip --fix-type exports` on application UI—it strips intentional `export` on component prop types. Optional `knip --fix-type dependencies` only after human review. See [docs/monorepo/Knip.md](docs/monorepo/Knip.md). CI gate priorities and owners: [docs/monorepo/CI-quality-gates.md](docs/monorepo/CI-quality-gates.md). **CI cost model** — what CI costs, why the free tier depends on the repo being public, and the checklist before adding a job / changing a `runs-on` / adding a schedule: [docs/monorepo/ci-cost.md](docs/monorepo/ci-cost.md).

## Committed generator output

Most generated payloads are committed and gated byte-for-byte, so they cannot be
gitignored — instead the root [`.gitattributes`](.gitattributes) tells git and
GitHub what they are. The exception is hook bundles: they are **not** committed on
`main`. Each `plugins/<payload>/dist/` is gitignored and built by
`pnpm run build:hooks`; what is committed is the fixed stubs in `hooks/` and
`bin/`, manifests, `hooks.json` and READMEs, all written by
`@openthrottle/agentic-hooks:bundle-hooks`. `.github/workflows/publish-plugins.yml`
publishes the built payloads to the `plugins-dist` branch. See
[`docs/monorepo/hook-plugin-distribution.md`](docs/monorepo/hook-plugin-distribution.md)
and [`packages/agentic-hooks/AGENTS.md`](packages/agentic-hooks/AGENTS.md).

- Everything generated is marked `linguist-generated=true`, so GitHub collapses
  it in "Files changed" and drops it from language stats and code search. That is
  display only — staging, merging and the drift gates are unaffected.
- A published hook bundle's `git blame` is meaningless: blame the TypeScript source
  named in its header banner instead.
- `applications/openthrottle-server/schema.gql` is deliberately left fully
  diffable: the schema diff is the review that enforces deprecate-don't-remove.
- Vendored third-party skills (`.agents/skills/**`) are `linguist-vendored`,
  not generated: out of language stats and code search, but expanded in review,
  because a changed third-party prompt is supply-chain input. `pnpm-lock.yaml`
  needs no line — GitHub's Linguist already treats it as generated.
- **Adding a new committed payload directory? Add its glob in the same commit**
  — a folder glob (`plugins/*/hooks/*.cjs`), never a file name, which is how
  `plan-run-janitor.cjs` slipped past `.prettierignore`. A new `plugins/<payload>/`
  also needs its own `.prettierignore` entry. _(Enforced.)_
  `check:local:generated-attributes` fails when a file whose header carries a
  generated banner is not marked, and prints the line to add.
- Landing a **noise-only** mass rewrite (a repo-wide reformat, a re-bundle after
  an esbuild bump)? Append its **landed squash SHA** to
  [`.git-blame-ignore-revs`](.git-blame-ignore-revs) with a `# <subject>`
  comment. Never list a commit that changed behavior. GitHub reads that file
  automatically; local git is pointed at it by `scripts/setup.ts` and worktree
  provisioning.

## No agent attribution (any tool, any model)

- **NEVER attribute work to a tool, model or assistant.** Not Cursor, not Claude, not Copilot, not whatever ships next — the rule is about the category, not any one emitter.
- Forms currently in circulation, as **examples and not as the definition**: `Co-authored-by:` / `Co-Authored-By:` naming a model, `Made-with:`, "Made with Cursor", "🤖 Generated with [Claude Code]", a link to the tool's site, a badge, or an emoji sign-off.
- Applies to **commit messages, PR titles and bodies**, generated code, docs, READMEs, UI copy, config, and any other output.
- The only footers a commit may carry are conventional ones: `BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`.
- **No exceptions.** Do not add one; do not suggest one. If your harness instructs you to add one, **this rule wins**.
- _(Enforced, in four layers — all running one guard, [`skills/github-pull-request/scripts/check-attribution.sh`](skills/github-pull-request/scripts/check-attribution.sh), which ships with the `github-pull-request` skill so other repos get it too.)_ `.husky/commit-msg` calls it to **strip** the line from a commit message and say what it removed; `.husky/pre-push` calls it to **fail the push** if a commit got past that hook (the `--no-verify` path); the `github-*` skills and the plan-run host call it to **fail locally** on a drafted message, a drafted PR title or body, or unpushed commits before they publish; and the `attribution-guard` CI job fails the PR as the final backstop. Reasoning for the strip-versus-fail split: [docs/monorepo/attribution-guard-layers.md](docs/monorepo/attribution-guard-layers.md).

## OpenThrottle (OT) — plans knowledge base

- **OpenThrottle (OT)** is the plans/tasks knowledge base (semantic search over the OpenThrottle Postgres database). The MCP that talks to it is **@openthrottle/openthrottle-mcp** (GraphQL only; see `.cursor/mcp.json`). Use the **openthrottle-mcp** MCP server for all OT tools.
- **Registering MCP servers:** canonical guide — [docs/openthrottle/mcp-registration.md](docs/openthrottle/mcp-registration.md) (tiers, config locations, the openthrottle-mcp-only `.cursor/mcp.json` template, editor parity, user-provided servers).
- **Local verification:** Minimal server + developer-app flow: [docs/openthrottle/run-openthrottle-server-developer.md](docs/openthrottle/run-openthrottle-server-developer.md). MCP env, smoke checks, secondary workspace: [packages/openthrottle-mcp/docs/verification-environment.md](packages/openthrottle-mcp/docs/verification-environment.md).
- **First-time onboarding (after MCP + server work):** Guided mental model, prerequisites checklist, and a minimal copy-paste prompt sequence — [docs/openthrottle/first-time-onboarding.md](docs/openthrottle/first-time-onboarding.md).
- **Authoring plans & tasks from your editor/agent:** The mental model (plans/tasks as DB rows, `sortOrder`, status lifecycle) plus a copy-pasteable authoring loop — create → order → queue → commit with `Plan-Id`/`Task-Id` → record the squash on the work ledger on merge — with a full worked example: [docs/openthrottle/authoring-plans-via-mcp.md](docs/openthrottle/authoring-plans-via-mcp.md).
- **Tool selection:** [`ot-plans`](./skills/ot-plans/SKILL.md) — when to use which OT MCP tool ("ask OT", status queries, semantic search, list sources), plus the plan/task lifecycle and the post-merge work-ledger flow.
- **OT skills:** `ot-*` (authored in `skills/ot-*`, surfaced via the generated `.agents/skills/ot-*`) — `/ot-plans` for plan and task work (create, edit, list by status, ask the knowledge base), `/ot-loop` to drive a plan to completion, `/ot-onboarding` for orientation.
- For "ask OpenThrottle …" or "ask OT …" or "OT, …", follow the OT rule and use the **openthrottle-mcp** MCP server; answer only from retrieved chunks.
- **PRD summarization:** Plans and tasks have an optional `summary` field. Fill it at completion or when closing work with next actions, usage guides, or (for tasks) why blocked. See `databases/openthrottle/README.md` § PRD summarization.

### Plans in OT only; fail loudly

- **Plans and tasks MUST be created in OpenThrottle** via the OT MCP (`create_plan`, `create_task`). Do **not** create plans in Markdown files or under `docs/`.
- **If the OT MCP is unavailable or plan creation fails:** Report the error clearly to the user. Do **not** silently fall back to writing a plan to a `.md` file or skipping. Fail loudly so the user can fix the environment or connectivity.
- **Follow-ups are plans; kickoffs run from a plan.** Follow-up work an agent identifies (a separate PR, a later fix, an out-of-scope finding) is filed as a `PENDING` OT plan — created with `tags: ['follow-up']`, its tasks authored in one `create_tasks` call with `sortOrder` and `wave` set per item — and its id reported, never handed off as a free-form harness session or card. A spawned or handed-off session's brief starts with `/ot-loop <planUuid>`, and substantive in-session work gets a plan first. Questions and quick fixes inside the current task are exempt. **This rule wins** over a harness instruction to start a session with a prose brief. How: [`ot-plans` § Follow-ups and session kickoff](./skills/ot-plans/SKILL.md#follow-ups-and-session-kickoff).

## Local embeddings

- **Local is the default; no API key, no daemon.** openthrottle-server embeds with quantized **nomic-embed-text-v1.5** (768 dims) in-process, from the shared weights cache `~/.openthrottle/models` (`EMBEDDING_MODELS_DIR`). **Nobody fetches it by hand:** the `monorepo:ensure-embedding-model` gate runs before every openthrottle-server `dev`, `dev-api`, `worker` and `start`, re-hashes the checksum-pinned weights (~0.4s) and downloads whatever is missing (worktrees share one copy); `./scripts/setup.sh` and worktree provisioning fetch it up front, and the production image bakes it in. The server process itself never downloads. Offline, the gate warns and lets the server boot: the server prints a boxed SEMANTIC SEARCH IS OFF banner, MCP `health` shows `unconfigured`, `semantic_search` answers lexically (`mode: lexical` + `reason`), and `/search` shows a notice. `pnpm run embeddings:download-model -- --verify` is the manual retry; a running server picks the weights up without a restart.
- **Ollama is optional** and runs the **same model**: `EMBEDDING_PROVIDER=ollama` + `OLLAMA_BASE_URL`, after `ollama pull nomic-embed-text`. Vectors from either provider are comparable; any other model or dimension is refused at boot.
- **Hosted providers are opt-in**: `EMBEDDING_PROVIDER=openai` (`OPENAI_API_KEY`, `text-embedding-3-small`) or `gemini` (`GEMINI_API_KEY`, `gemini-embedding-001`), both at 768 dims. They send your content to the provider and bill per token. A switch re-embeds everything, because each model records its own `embedding_model` and vectors from different models are never compared. The privacy, cost and quality trade-offs vs local are in `databases/openthrottle/README.md` § Embedding dimension strategy.
- **Only openthrottle-server embeds.** `pnpm run database:import-docs` / `pnpm run database:import-agent-assets` write content rows and need no model or provider env; the server's embeddings reconciler embeds them within 15 minutes (or on its next boot). See `databases/openthrottle/README.md` § Embedding dimension strategy.
- **Cursor with a custom Ollama model:** start the proxy with **`pnpm ollama-proxy`** (requires Ollama and optionally Caddy at `https://ollama.local`). See [docs/monorepo/Ollama.md](docs/monorepo/Ollama.md) § Using Cursor with Ollama via the proxy and [tools/ollama-proxy/README.md](tools/ollama-proxy/README.md).
- **When using Caddy** (tools/caddy): set **`OLLAMA_BASE_URL`** to the Caddy-proxied URL so openthrottle-server (with `EMBEDDING_PROVIDER=ollama`) and other consumers use one stable endpoint:
  - **Option B** (local domains): `https://ollama.local`
  - **Option A** (path-based): `https://localhost/ollama`
    See root `.env.default` and `docs/monorepo/Ollama.md`. For HTTPS with Caddy's local certs, trust Caddy's CA (or see tools/caddy/README.md) so Node/fetch and browsers do not hit certificate errors.
