# 🐙 NX

This monorepo uses **Nx** for task orchestration and caching, and **pnpm** for workspace dependency management.

## Repo conventions (high signal)

- **Package manager**: use `pnpm` (enforced by `preinstall`).
- **Nx config style**: projects are primarily **inferred** via each project’s `package.json` `nx` block (not `project.json`).
- **Tags**: projects are expected to have at least one `technology:*` tag, plus `type:*` and `name:*` tags in most cases.
  - See `docs/monorepo/NX/tags.md`.
  - Validate with `pnpm nx:validate-tags`.
- **Caching**: Nx's **local** cache (`.nx/cache`), persisted across CI runs by the free **GitHub Actions cache** (`actions/cache` in `.github/actions/node-setup`). There is **no remote cache backend** — the paid `@nx/gcs-cache` Powerpack plugin and its GCS bucket were retired (see [Operational decisions](#operational-decisions-2026-07-21) and [ci-cost.md](./ci-cost.md)). Nothing to configure in `nx.json`, no `NX_KEY`, no GCP credentials.
- **CI patterns**: CI uses `nx affected` and distributes work using `scripts/parallelize-tasks.ts`. Gate priorities (P0–P4), owners, and job mapping: [CI-quality-gates.md](./CI-quality-gates.md).
- **Dependency graph**: `scripts/nx-dependency-graph.ts` generates a static `dependency-graph.html` artifact; a scheduled workflow commits snapshots under `docs/nx/dependency-graphs/`.
- **`pnpm sync` vs `nx sync`**: despite the shared name, these are unrelated. `pnpm sync` runs the root `sync:openthrottle:*` scripts (`scripts/sync-subtree.ts`), a **git subtree sync** of vendored application content. `nx sync` is Nx's **TypeScript project-reference tsconfig sync**. Use it: `pnpm nx sync:check` reports drift (and gates `check:local`), `pnpm nx sync` fixes it. It is deliberately **not** wired into the task pipeline, so `nx run`/`affected` never sync for you and never fail on drift. See [`nx sync` — the TypeScript project-reference sync](#nx-sync--the-typescript-project-reference-sync).

### Operational decisions (2026-07-21)

Recorded from the Nx implementation audit:

- **Remote cache — RETIRED (2026-08-18, plan `6ced8d0e`).** The `@nx/gcs-cache` Powerpack plugin and the `openthrottle-staging-nx-cache` GCS bucket are gone. CI now persists Nx's local `.nx/cache` through the **free GitHub Actions cache** only.
  - **Why.** The Actions cache layer already existed in `.github/actions/node-setup`, so a paid backend was duplicating a free one. Measured GCS spend was **~$6.10/month** — 1.41M `ReadObject` Class B ops, and only **2.47 GB of egress (~$0.30)**, disproving the assumption that egress was the driver. Removing it also drops the last **Commercial-licensed dependency** in the tree (both `@nx/gcs-cache` and `@nx/key` waivers are deleted from `license-policy.json`), two workflow steps, five env vars, and `NX_KEY` entirely. This closes the migration that the licence waiver tracked as plan `aec1b0b2`.
  - **The CREEP-safe guarantee (CVE-2025-36852) survives for free, by construction.** GitHub Actions cache scoping is exactly the trusted-`main`-writes / PRs-read-only model the `NX_POWERPACK_CACHE_MODE` ternary implemented by hand: a PR branch **restores** from its base branch's caches but can never **save** into them, and branch caches are isolated from each other. No env override to keep in sync, and no untrusted writer can poison what `main` reads.
  - **The cache key is per-commit on purpose.** `actions/cache` skips its save step entirely on an exact key hit, so the previous key — `hashFiles('nx.json', 'pnpm-lock.yaml')` with no variable component — was written once and then **never refreshed** until one of those files changed, silently discarding every task hash computed after that first save. The key now carries `github.sha` and the tiered `restore-keys` still restore the newest compatible cache.
  - **Trade-off.** The Actions cache is 10 GB per repo with LRU eviction, shared across all branches and workflows, and entries untouched for 7 days are evicted. That is more eviction pressure than the old 2.19 GB bucket with a 90-day lifecycle, so cross-branch hit rate may drop somewhat.
  - **The poisoned-cache hazard follows the cache, not the backend.** Gitignored `__generated__` output is invisible to Nx hashing, so a cache entry can be poisoned regardless of where it is stored. Keep the codegen-before-affected step ordering in `continuous-integration.yml`, and keep the runbook — now retargeted at the Actions cache, where recovery is deleting entries via `gh cache delete` instead of `gcloud storage rm`. Truncated-dist integrity (a separate class from CREEP) is still guarded by `verify-dist-complete` (plan 935ea415 / PR #308).
- **Nx Cloud — not adopted.** The workspace stays on the local cache plus the free Actions cache. CI sharding does **not** depend on it: `scripts/parallelize-tasks.ts` splits the affected projects across a 3-box GitHub Actions matrix (live since OT plan `b19377d1`; see [ci-cost.md](./ci-cost.md) § CI sharding). The workflow keeps a `merge_group` trigger for GitHub's merge queue, but the queue on `main` is currently **disabled** (see [ci-cost.md](./ci-cost.md) § Merge queue on `main`) so the trigger is inert; if the queue returns, entries simply run this same workflow against GitHub's synthetic `gh-readonly-queue/...` refs — none of which implies Nx Cloud. Nx Cloud's distributed task execution, the test atomizer, flaky-task retries, and self-healing CI remain unavailable. The `monitor-ci` agent skill depends on Nx Cloud; it self-detects the missing connection (its "Step 0") and reports itself inoperable here, so it is a no-op until/unless Nx Cloud is adopted.
- **Releases — manual only.** `nx release` stays invocable via the `workflow_dispatch`-only `nx-release.yml`; the duplicate commented-out release job in `continuous-integration.yml` has been removed. Nothing is `publish:true` today (nothing is being published), so there is no automated release on `main`. Flip a package to `publish:true` and revisit if publishing resumes.

**Features:**

- [Continuous tasks](https://nx.dev/blog/nx-21-continuous-tasks)
- [NX Terminal](https://nx.dev/blog/nx-21-terminal-ui)

**Resource:**

- [NX - Single Version Policy](https://nx.dev/concepts/decisions/dependency-management#single-version-policy)
- [NX - Migration](https://nx.dev/nx-api/nx/documents/migrate)

**Reading list:**

- [ ] https://nx.dev/concepts/sync-generators
- [ ] https://nx.dev/concepts/nx-plugins
- [ ] https://nx.dev/concepts/inferred-tasks
- [ ] https://nx.dev/concepts/task-pipeline-configuration
- [ ] https://nx.dev/concepts/types-of-configuration
- [ ] https://nx.dev/concepts/executors-and-configurations

## `nx sync` — the TypeScript project-reference sync

`nx sync` is Nx's **TypeScript project-reference tsconfig sync**, driven by the
`@nx/js:typescript-sync` generator. (Despite the shared name it is unrelated to `pnpm sync`, which
runs the root `sync:openthrottle:*` scripts — a git subtree sync of vendored application content.)

**This section is the single authoritative statement on `nx sync` in this repo.** Every other
surface either restates the one-line rule and links here, or says nothing.

### The rule

```bash
pnpm nx sync:check   # report project-reference drift; changes nothing
pnpm nx sync         # fix it — then inspect the diff before committing
```

- **Both commands work.** Use them.
- **`sync:check` is a gate**, and runs inside `pnpm run check:local`. It exits 0 in sync, 1 on
  drift; it never writes to the tree.
- **Inspect the diff before committing a sync.** `nx sync` edits tsconfigs across the workspace;
  the changes are almost always right, but they are still changes you own.
- **The generator is deliberately NOT attached to the task pipeline.** `nx run` / `run-many` /
  `affected` will never sync for you, and never fail because the tree is out of sync. That is
  intentional — see below.

### Why the generator stays out of the task pipeline

Wired into the pipeline, an out-of-sync tree **hard-fails every non-interactive `pnpm nx`
invocation**. In `nx/dist/src/tasks-runner/run-command.js`,
`ensureWorkspaceIsInSyncAndGetGraphs` returns early on `isCI()`, then `process.exit(1)`s when
`!process.stdout.isTTY` — **before** the `applyChanges` branch is ever reached. Measured on
23.1.3 with the generator temporarily attached as a task generator and the tree out of sync:

| Environment                                                                                      | Result                                 | Tree synced? |
| ------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------ |
| non-TTY, not CI (agent shells, script `execSync`, the worktree provisioner, any piped `pnpm nx`) | **exit 1** on every target             | no           |
| non-TTY, `CI=true`                                                                               | exit 0 — the check is skipped entirely | no           |
| non-TTY, not CI, `--skip-sync`                                                                   | exit 0                                 | no           |
| TTY, not CI                                                                                      | auto-applies and proceeds              | yes          |

So attaching it would fail every agent and script in the repo **while protecting nothing in CI**,
where the check never runs at all. Nx's own source comment at `run-command.js:55-58` acknowledges
the ordering and warns against suggesting `applyChanges` as a fix for "CI/agent contexts".

### How both facts hold at once

`nx.json` uses two independent registration channels:

```jsonc
"sync": {
  // keeps it OUT of the task pipeline -> no non-TTY hard-fail
  "disabledTaskSyncGenerators": ["@nx/js:typescript-sync"],
  // registers it for the `nx sync` / `nx sync:check` COMMANDS -> they work
  "globalGenerators": ["@nx/js:typescript-sync"]
}
```

The gate path (`collectEnabledTaskSyncGeneratorsFromTaskGraph`) reads only **target**
`syncGenerators`, filtered by `disabledTaskSyncGenerators`; it never consults `globalGenerators`.
The `nx sync` / `sync:check` commands call `collectAllRegisteredSyncGenerators`, which **unions**
both. Hence: working commands, ungated pipeline.

`sync.applyChanges` is deliberately absent. It only governs the pipeline path, which is disabled,
and it cannot help a non-TTY shell in any case.

The `syncGenerators` entry on the inferred `typecheck` targets
(`tools/nx-plugins/package-typecheck.ts`) is kept but **inert** — `disabledTaskSyncGenerators`
filters it out. It is retained so that attaching the generator again would be a one-line change
rather than a two-place hunt.

### Upstream nrwl/nx#36297 — measured, and no longer the reason

The ban this section replaces was adopted on **Nx 22.7.4** against
[nrwl/nx#36297](https://github.com/nrwl/nx/issues/36297): `@nx/js` inferring spurious, unstable
`static` edges between sibling React Router apps, which sync then wrote into app tsconfigs and
broke their typechecks.

Re-measured **2026-09-10 on Nx 23.1.3** — 18 trials across 6 cells (warm and purged `.nx` ×
daemon off and on, a fresh worktree, and a fresh worktree immediately after generating a new
package):

- **zero** app→app tsconfig references and **zero** app→app project-graph edges, in every trial
- **byte-identical** diffs within and across cells — not the "unstable across runs" behaviour the
  issue describes
- a fully synced tree passes `typecheck --all` (72 projects), `build --all` (51) and `test --all`
  (71) plus all of `check:local`, with no `circular dependency` anywhere

The issue is still open and picked up a report from another user _after_ ours, so treat this as
**cannot reproduce on 23.1.3**, not _fixed_.

**An `applications/*` → `applications/*` reference is still always wrong** — apps do not import
each other. Two existing gates cover it without bespoke tooling: `@nx/enforce-module-boundaries`
constrains `type:application` to depend only on `type:package`, so a real cross-app import is an
ESLint error; and a phantom reference with no backing import breaks `typecheck` loudly, which was
the original 22.7.4 symptom.

### One trap, if you script this

`nx g @nx/js:typescript-sync` — invoking the generator _directly_ rather than through
`nx sync` — has an **inverted exit code**. A sync generator returns `{ outOfSyncMessage }` rather
than a task callback, so `nx g` throws `TypeError: task is not a function` **after** writing every
change: **exit 1 means "synced", exit 0 means "nothing to do"**. Prefer `pnpm nx sync`, which has
sane exit semantics. `sync:check` is likewise normal: 0 in sync, 1 on drift.

## 🏋️‍♂️ Updating

NX ships a constant stream of updates and the more current we can stay, the faster we can move over time.

> [!WARNING]
> 🚨 If we're several versions behind, we should [upgrade one version at a time](https://nx.dev/recipes/tips-n-tricks/advanced-update#one-major-version-at-a-time-small-steps).

```bash
nx migrate latest

NODE_ENV=development nx migrate --run-migrations --create-commits
```

## 🚀 Releases

We're making use of the `nx release` command to publish our npm packages. Right now these packages are published to Github packages, but we're working on getting them published to NPM as well.

Release commits **must not bypass Husky hooks**. The CI `🚀 NX Release` workflow runs `nx release` and relies on the same repository checks (commitlint, lint-staged/typecheck/lint) to keep release commits safe.

**Resources:**

- [Automated npm package publishing with Nx](https://www.epicweb.dev/tutorials/versioning-and-releasing-npm-packages-with-nx/nx/automated-npm-package-publishing-with-nx)
- [pnpm publishConfig](https://pnpm.io/package_json#publishconfig)
- [Keep Nx Versions in Sync](https://nx.dev/recipes/tips-n-tricks/keep-nx-versions-in-sync)

**Scratch Pad:**

```bash
nx release publish -p @visormatt/tester

# Take the package.json file and transform it for publishing
node --experimental-strip-types ./scripts/pnpm-package.ts {projectRoot}
```

## 🤖 Generators

We make heavy use of generators in this monorepo, from generating a React Component to a new React Router Application, its all templated... This allows me to keep the code consistent across all projects over the long haul. Additionally, by making it easy REALLY EASY to create that new package, we tend to do it more often.

- [@nx/nest](https://nx.dev/nx-api/nest)
- [@nx/react](https://nx.dev/nx-api/react)

## 🧩 Plugins

- https://nx.dev/plugin-registry
- https://nx.dev/nx-api/powerpack-conformance
- https://nx.dev/nx-api/powerpack-owners
- [@nx/eslint-plugin](https://nx.dev/nx-api/eslint-plugin)

## Local Nx inference plugins (`tools/nx-plugins/`)

This workspace ships two local `createNodesV2` inference plugins, registered in `nx.json`:

```jsonc
// nx.json
"plugins": [
  // ...
  { "options": { "compiler": "tsc" }, "plugin": "./tools/nx-plugins/react-router-typecheck.ts" },
  { "options": { "compiler": "tsc" }, "plugin": "./tools/nx-plugins/package-typecheck.ts" }
]
```

Both infer a real `typecheck` target so the policy lives once at the workspace root instead of drifting per project:

- **`react-router-typecheck.ts`** — matches `applications/*/react-router.config.ts`. React Router apps are source-first (no dist emit), so the target runs `react-router typegen && tsc --noEmit` over source + tests, with `outputs: []`.
- **`package-typecheck.ts`** — matches projects with a `tsconfig.lib.json`/`tsconfig.app.json` (buildable packages and the NestJS server). The target runs `tsc --build --emitDeclarationOnly` (emitting dist `.d.ts` as outputs), then `tsc --noEmit -p tsconfig.test.json` when a test tsconfig exists.

**The `tsc` in both commands is a knob, not a hardcode.** Both plugins resolve their compiler binary through the shared [`tools/nx-plugins/typecheck-compiler.ts`](../../tools/nx-plugins/typecheck-compiler.ts): `compilerOverrides[projectRoot]`, then `$OPENTHROTTLE_TSC_BIN`, then the plugin's `compiler` option, then the built-in `tsc6` default. `tsc` is TypeScript 7 and `tsc6` is TypeScript 6 — the `"options": { "compiler": "tsc" }` above is what puts the workspace on 7, and deleting it reverts to 6. That module also supplies `TYPECHECK_COMPILER_INPUTS`, which both plugins spread into `inputs` so the compiler identity is part of the task hash; without it Nx serves one compiler's cached result for the other's run. Full rationale, the per-consumer resolution table and the cache-purge procedure live in [MONOREPO.md § TypeScript toolchain](../../MONOREPO.md#typescript-toolchain-two-compilers-one-workspace).

`nx.json` `targetDefaults.typecheck` still layers `cache`/`dependsOn` (`^typecheck`) on top of what these plugins infer.
