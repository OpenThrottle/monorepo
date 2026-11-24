# Duplication check: is this already done somewhere, and where does the shared one go?

Principle 5 (`dup-01` to `dup-12` in the [catalog](catalog.md#5-duplication-the-second-copy-is-a-package)). A manual recipe: run it for each **new exported function, hook, component, constant or string** a diff adds, in the order below, and stop at the first step that finds a home. Skip what [machine-checks.md](machine-checks.md) already covers (`clsx`, agent CLI spawn, `prefer-graphql-fragment`). The normative ladder lives in [ot-folders § promotion ladder](https://github.com/openthrottle/monorepo/blob/main/skills/ot-folders/SKILL.md#the-promotion-ladder); this file only says how to detect and which row to apply.

## 1. Detect (cheapest first)

Search the **whole tree**, not just the diff's project, and ignore `__tests__/` hits until the end.

1. **Grep by distinctive literal.** Take a string, test id, copy key, error message, regex or magic number from the new code and `git grep -n '<literal>' -- applications packages tools scripts`. This is the step that finds copy 1 when the diff adds copy 2. Prefer a literal over a name: copies are rarely named alike.
2. **Grep by name and by intent words.** `git grep -n -E '(const|function) (parse|format)Date'`, plus the verbs and nouns of the job (`parseEnv`, `CheckoutPath`, `toContainerPath`). Also `ls` the sibling `utils/` folders: `app/global/utils/`, the area's `utils/`, and `packages/*/src/utils/`.
3. **Read package barrels.** `git grep -n -i '<subject>' -- 'packages/*/src/index.ts'` and open the owning package's `index.ts`. A package that owns the subject (`nodejs-utils`, `openthrottle-agentic-utils`, `react-router-utils`, `react-router-shadcn`, `react-router-ui-global`) is the home.
4. **`semantic_search`, last and only as a hint.** It indexes plans, tasks and docs, **not code** (see [§ 5](#5-verdict-on-semantic_search)). Use it to learn whether someone planned or discussed this work: OT MCP `semantic_search({ query: "<one-sentence intent, not the code body>", limit: 5 })`. Parameters are `query` and `limit` (max 50) only; there is no source filter. Call `health` first; a plan or task hit is a lead to verify with grep, never a finding. Keep `limit` at 5: at 8 or more the result overflows to a file.

A copy only counts when the **behavior** matches, not the name. Before filing a finding, open both and say what differs.

## 2. Decide

`semantic_search` aside, the home is the **lowest rung that holds every consumer** ([ot-folders](https://github.com/openthrottle/monorepo/blob/main/skills/ot-folders/SKILL.md#the-promotion-ladder): promote when the second consumer appears, not before). One use stays where it is; do not file "make this reusable".

| Where the copies live                                                                                                                    | Shared version goes                                                                     | Catalog id, severity                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Two files in one route area                                                                                                              | That area's `utils/`, `hooks/`, `data/` (not `app/global/`)                             | none; mention only if the diff adds the second copy (`suggestion`)  |
| Two route areas of one app, no existing home                                                                                             | `app/global/<utils\|hooks\|components\|data>/`                                          | `dup-01`, `suggestion`                                              |
| Two apps, or an app and a package                                                                                                        | An existing owning package, else a new one                                              | `dup-02`, `fix before PR`                                           |
| A helper that already has a home: exported from a package barrel, or an existing shared `utils` or `config` module whose subject matches | Import it; delete the copy                                                              | `dup-03`, `fix before PR`                                           |
| A private same-named helper in another file (not a home)                                                                                 | Leave it; note that promoting it is out of scope                                        | `dup-03`, `suggestion`                                              |
| The same constant set or type vocabulary in two packages                                                                                 | Derive one from the other, or let the owning package export it                          | `dup-11`, `suggestion`                                              |
| Three or more copies of an inline literal or pattern with no home                                                                        | A builder in `app/global/utils/`; state the count                                       | `dup-12`, `suggestion`                                              |
| Hand-rolled UI, raw colors, `DropdownMenu` row actions                                                                                   | `react-router-shadcn` primitive, tokens, `GlobalPopover`                                | `dup-04`, `dup-05`, `dup-06`, `fix before PR`                       |
| Hand-written repository mocks or test setup                                                                                              | `createBaseRepositoryMock`, `setupReactRouterTest`                                      | `dup-07`, `dup-08`, `fix before PR`                                 |
| A type or helper mirroring a GraphQL shape                                                                                               | A `.graphql` fragment and the generated `*Fragment` type                                | `dup-09`, `fix before PR`                                           |
| The same copy string in a component and its spec                                                                                         | `data/data.copy.ts`                                                                     | `dup-10`, `suggestion`                                              |
| Same logic in 2+ server services or resolvers                                                                                            | The existing service that owns the subject, else one new service in `services/<name>/`  | `dup-03` if a home exists, otherwise `suggestion`                   |
| Two scripts or a script and a package                                                                                                    | The package that owns the subject; a script is not importable                           | `dup-03`                                                            |
| No package owns the subject (two apps or a server + an app)                                                                              | Recommend a new package by subject name, via `package` (`--type` node, react or nestjs) | `dup-02`; name the generator command, never hand-write the skeleton |

New package: name from the **subject**, not the first consumer (`checkout-paths`, not `scheduler-utils`); never `shared`, `common`, `helpers` ([ot-folders](https://github.com/openthrottle/monorepo/blob/main/skills/ot-folders/SKILL.md)). Scaffold with `pnpm nx g @tools/generators:package --type=<nestjs|node|react|tools> --organization=@openthrottle --name=<slug>` ([ot-generators](https://github.com/openthrottle/monorepo/blob/main/skills/ot-generators/SKILL.md); `--dry-run` first).

## 3. Boundary checks before naming a home

- **Browser vs Node.** If any React Router app will import the home, it must not pull a `node:*` builtin or Node-only package through its barrel. Use a `react-router-*` package or a `nodejs-*` one with a browser-safe entry ([ot-client-node-boundary](https://github.com/openthrottle/monorepo/blob/main/skills/ot-client-node-boundary/SKILL.md)). Server-only code stays `*.server.ts` or in a `nestjs-*` package.
- **Server-consumed packages.** A package `openthrottle-server` imports needs top-level `exports` pointing at `dist` and a real `build` target ([packages/AGENTS.md § Source-first vs built](https://github.com/openthrottle/monorepo/blob/main/packages/AGENTS.md)). `nestjs-*` is always built.
- **Source-first packages.** `react-router-*` and packages carrying the `__build` placeholder in `package.json` must **not** gain a `build` target. If the home would need one, pick or create a different package.
- **Direction.** An application is never imported; `applications/*` to `applications/*` references are always wrong. Import a package by its main entry only.
- **Tags and sideEffects.** A new or extended package keeps its `type:`/`technology:` tags and a truthful `sideEffects`.

## 4. Measured results

Method: `git grep <pattern> <sha>^ -- <paths>` on the tree **before** each fix; nothing checked out. "Relevant" means a copy or the eventual home; "FP" means a file that matches but is neither. Run 2026-11-24.

### Case 1: skill source badge, [#479](https://github.com/OpenThrottle/monorepo/pull/479), `76498b905`

Two surfaces in **one area** (`routing/skills`) each hand-built source label, color and tooltip with nested ternaries (`skills-table-columns.tsx`, `SkillIntroductionBadges.tsx`). Went to `getSkillSourceBadge` in `routing/skills/utils/source-badge.ts` plus `getSkillSourceKind` in `filter-skills-by-source.ts`. The area `utils/` was correct: not promoted to `app/global/`.

| Step                                                       | Hits    | Relevant | FP  |
| ---------------------------------------------------------- | ------- | -------- | --- |
| Literal `skill-source-badge` (non-test files)              | 2       | 2 of 2   | 0   |
| Literal `SKILLS_SOURCE_COPY.externalLabel` (non-test)      | 2       | 2 of 2   | 0   |
| Literal `=== 'openthrottle'`                               | 4 files | 2        | 2   |
| Name `SourceBadge\|source-badge\|SourceKind`               | 0       | 0        | 0   |
| Barrel / `utils/` listing (area 13 files, global 10 files) | 0       | 0        | 0   |

Flagged: yes, by literals only, and only because the diff for copy 2 supplied them. Name and barrel steps correctly found no home (none existed).

### Case 2: checkout to cwd resolution, [#956](https://github.com/OpenThrottle/monorepo/pull/956), `bc830b5c9`

`ConversationStreamResolver` and `PlanEnqueueService.resolveWorkspace` each re-implemented the ownership check, `repositoryId` rule and `toContainerPath(filesystemPath)` that `ScheduledAgentJobCheckoutPathService` already did. Went to one `CheckoutPathService` (`services/checkout-path/`), the existing service renamed and extended. Home already existed (`dup-03`), in a server `services/` folder, not a package.

| Step                                                             | Hits     | Relevant                                                 | FP   |
| ---------------------------------------------------------------- | -------- | -------------------------------------------------------- | ---- |
| Name `CheckoutPath\|resolveWorkspace` in server `src` (non-test) | 32 files | 6 (home x3, `checkout-path-resolution` x2, plan-enqueue) | 26   |
| Literal `toContainerPath` (code files, non-test)                 | 14 files | 2 strict (resolver, home); 5 if residual copies count    | 9-12 |
| Barrel: `openthrottle-agentic-utils` exports `toContainerPath`   | 1 export | 0 (the primitive, not the composed resolver)             | 1    |

Flagged: yes. A reviewer reading the new code's distinctive pair (`toContainerPath` next to `filesystemPath`, 5 files) lands on the home within two opens. The name grep is noisy because `CheckoutPath` substring-matches worktree services; combine two terms. It also surfaced a second sibling service (`checkout-path-resolution`) the fix did not merge. After the fix `code-search.resolver.ts`, `workspace-folders.service.ts` and `workspace-editor-config.service.ts` still pair `toContainerPath` with `filesystemPath`; not verified whether they are legitimate.

### Case 3: `.env` parsing, [#838](https://github.com/OpenThrottle/monorepo/pull/838), `4ff6a1af9`

`scripts/utils/env.ts` hand-rolled a dotenv parser (and mishandled inline comments) while `scripts/openthrottle-database-migrations.ts` carried a local `readDotenv` using the Node builtin. Fix: `parseEnvContents` delegates to `node:util` `parseEnv`; the local copy was deleted. Home was the existing scripts util (`dup-03`).

| Step                                                               | Hits     | Relevant                                                             | FP                                              |
| ------------------------------------------------------------------ | -------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| Name `parseEnv\|readDotenv\|readEnvFile` (non-test, non-generated) | 11 files | 3 (`utils/env.ts`, migrations script, `agentic-hooks/config/env.ts`) | 8 consumers                                     |
| Literal `startsWith('export ')` / `slice(7)`                       | 2        | 2 (`utils/env.ts`, `service-accounts.utils.ts`)                      | 0                                               |
| Barrel `packages/*/src/index.ts` for `env`                         | 1        | 1 (`agentic-hooks` re-exports `config/env.ts`)                       | 5 unrelated lines (`dotenv` use, `process.env`) |

Flagged: yes, and it found a **third and fourth parser** the fix left in place (`agentic-hooks` `parseEnvLine`, `service-accounts.utils.ts`). The eight FP are consumers of the home, which is what you want to see when deciding it stays in `scripts/utils/`.

### Semantic search probes

Six calls total. Code chunks returned across all of them: **0** (the index reports 5,760 code embeddings; `source` is only ever `plan`, `task` or `documentation`).

| Probe (limit)                                                  | Relevant in top results                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `parseDate` body as a one-liner (8)                            | 0 of 8                                                                                   |
| Verbatim `parseDate` signature (50)                            | 0 of 50 (`dates.ts` never returned; 10 plans and 40 tasks)                               |
| Intent: format a date string, null when invalid (5)            | 0 of 5 (dashboard daily-stats tasks mention dates)                                       |
| Case 1 intent: skill source badge color, label, tooltip (5)    | 2 of 5 (tasks that built the badge and `SkillSourceKind`); pointers to history, not code |
| Case 2 intent: checkout id to process-view path, ownership (8) | 3 of 8 (tasks naming the consolidation); 0 code                                          |
| Case 3 intent: parse `.env` into a map, strip quotes (5)       | 2 of 5 (the bug plan at 0.76 and its audit task); 0 code                                 |

Code-probe precision: 0 of 81 returned chunks. Plan and task probe precision on the three historical intents: 7 of 18 relevant, none of them code. Two oddities: results are not sorted by similarity, and one plan scored 0.9999999 for an unrelated query, so ignore the number.

`health` reported `status: ok`, local `nomic-embed-text-v1.5`, 768 dims, 0 stale. The indexed tree is the current one, so for the historical cases this measures only whether history is findable now.

## 5. Verdict on `semantic_search`

**Not good enough for duplicate detection; a follow-up plan is needed.** Grep and barrel reading carried every case. The MCP tool never returns code, so "is this already done somewhere?" cannot be answered by it.

A server-side code search already exists: the `codeSemanticSearch(input: { repositoryId, query, limit })` GraphQL query (`code-search.resolver.ts`, indexes per registered repository, `SETTINGS_READ`). The follow-up would need:

1. An MCP tool (or `source`/`kind` filter on `semantic_search`) that exposes `codeSemanticSearch`, with `repositoryId` defaulting to the checkout the session runs in, returning `sourcePath`, line range and a short snippet.
2. A small result budget (the current 8-chunk response already overflows the tool limit for task text), and sorting by similarity.
3. An eval set from the cases above (query = new function body, expected = path of the home) to measure precision at 5 before trusting it; add `parseDate` in `app/global/utils/dates.ts` as the first positive.
4. A check that worktree and plan-run checkouts are indexed, since the index follows registered repositories rather than the reviewed diff.

Until then the recipe stays grep-first; treat any semantic hit as a lead.

## Not verified

- `codeSemanticSearch` itself was not called (needs an authenticated GraphQL session and a registered `repositoryId`), so its precision is unmeasured.
- Whether the three residual `toContainerPath` consumers in Case 2 are real duplicates.
- Counts are over one pre-fix tree each; recall on other cases is unknown.
