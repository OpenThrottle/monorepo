# 🐙 NX

This monorepo uses **Nx** for task orchestration and caching, and **pnpm** for workspace dependency management.

## Repo conventions (high signal)

- **Package manager**: use `pnpm` (enforced by `preinstall`).
- **Nx config style**: projects are primarily **inferred** via each project’s `package.json` `nx` block (not `project.json`).
- **Tags**: projects are expected to have at least one `technology:*` tag, plus `type:*` and `name:*` tags in most cases.
  - See `docs/monorepo/NX/tags.md`.
  - Validate with `pnpm nx:validate-tags`.
- **Caching**: remote caching is configured via `@nx/gcs-cache` against a single self-hosted GCS bucket (`openthrottle-staging-nx-cache`). `nx.json` commits `ciMode: "read-only"` and `localMode: "read-only"` as safe defaults; **main-branch CI opts into writes via the `NX_POWERPACK_CACHE_MODE=read-write` env var** (which overrides both modes), while every PR / `merge_group` / deploy build stays read-only (CREEP-safe single-bucket model, CVE-2025-36852 — see [Operational decisions](#operational-decisions-2026-07-21)).
  - Setup notes: `docs/infra/gcs-nx-cache-verify.md`.
- **CI patterns**: CI uses `nx affected` and distributes work using `scripts/parallelize-tasks.ts`. Gate priorities (P0–P4), owners, and job mapping: [CI-quality-gates.md](./CI-quality-gates.md).
- **Dependency graph**: `scripts/nx-dependency-graph.ts` generates a static `dependency-graph.html` artifact; a scheduled workflow commits snapshots under `docs/nx/dependency-graphs/`.
- **`pnpm sync` vs `nx sync`**: despite the shared name, these are unrelated. `pnpm sync` runs the root `sync:openthrottle:*` scripts (`scripts/sync-subtree.sh`), a **git subtree sync** of vendored application content. `nx sync` is Nx's **TypeScript project-reference tsconfig sync** — do **not** run it in this repo; it can inject bogus cross-project tsconfig references and break React Router app typechecks.

### Operational decisions (2026-07-21)

Recorded from the Nx implementation audit:

- **Remote cache writes — main-only (updated 2026-08-08).** The GCS cache uses a **single-bucket, main-only-writes** model. `nx.json` commits both `ciMode: "read-only"` and `localMode: "read-only"` as safe defaults; `continuous-integration.yml` and `nx-release.yml` set **`NX_POWERPACK_CACHE_MODE=read-write` only when the branch is `main`** so the trusted main build populates entries, while PR / `merge_group` / deploy builds stay read-only. This is the CREEP-safe posture (CVE-2025-36852) for a single bucket: no untrusted writer can poison what main reads, and PRs still get warm hits from main's last build.
  - **Why the env var, not a `sed` of `localMode`.** `@nx/gcs-cache`'s `getActiveCacheMode()` uses `ciMode` (not `localMode`) whenever `isCI()` is true, and `NX_POWERPACK_CACHE_MODE` overrides both. So (a) editing `localMode` has **no effect in CI**, and (b) `sed`-ing `nx.json` in-place leaves the working tree dirty, which trips the codegen `git diff --exit-code` on main (only main, since the PR value was an unchanged no-op). The env override fixes both — it changes the mode with zero file mutation. The `NX_GCS_BUCKET` `sed` stays (it writes the same value today, a clean no-op).
  - The staging/production bucket ternaries remain no-ops (both resolve to `openthrottle-staging-nx-cache`); the real two-bucket model is only needed if PRs ever need to write. Requires the main CI service account to hold object write IAM on the bucket. Truncated-dist integrity (a separate class from CREEP) is guarded by `verify-dist-complete` (plan 935ea415 / PR #308).
- **Nx Cloud — not adopted.** The workspace stays on self-hosted `@nx/gcs-cache`. The CI sharding infra (`scripts/parallelize-tasks.ts`, the matrix, the `merge_group` trigger) is built but pinned to a single runner as a deliberate cost tradeoff; **enable it when CI wall-time regularly approaches the 15-minute job timeout** (rough trigger: sustained > ~12 min). Distributed task execution, the test atomizer, flaky-task retries, and self-healing CI remain unavailable. The `monitor-ci` agent skill depends on Nx Cloud; it self-detects the missing connection (its "Step 0") and reports itself inoperable here, so it is a no-op until/unless Nx Cloud is adopted.
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

## 🧯 Runbook: poisoned remote cache (truncated `tsc --build` dist)

### Symptom

A build/test fails with `Cannot find module '.../dist/src/**/*.js'` for a module
whose source clearly exists — most tellingly, a sibling in the same `dist/`
imports the missing file (e.g. `foreign-workspace-context.js` importing
`./workflow.js` while `workflow.js` is absent). It reproduces on a clean checkout
because the incomplete `dist/` is served from the Nx remote cache.

### Incidents

- **2026-07-24** (agentic-ralph, commit `4c8062b7`): stale/unhashed
  `src/__generated__` output cached under a fresh hash. Fixed by per-package
  `.gitignore` `!src/__generated__/**/*` + narrowing `codegen-graphql` outputs.
- **2026-07-29** (PR #254, `@openthrottle/openthrottle-agentic-utils`): CI
  restored a truncated `build` artifact from
  `gs://openthrottle-staging-nx-cache/nx-cache/<hash>` — dist had
  `foreign-workspace-context.js` but was missing `workflow.js`, so `monorepo:test`
  failed with `Cannot find module .../dist/src/utils/workflow.js`. Two objects
  (hashes `12318852324888656449`, `14094666500388666538`) were confirmed
  incomplete and purged; a fresh build was healthy.

### Mechanism (confirmed, plan 935ea415)

The buildable packages (those with a `tsconfig.lib.json`) get an inferred
`build` target of `tsc --build tsconfig.lib.json`, whose Nx `outputs` include both
the `dist/**` emit AND `dist/tsconfig.lib.tsbuildinfo`. `tsc --build` is
**incremental**: it trusts the tsbuildinfo and does **not** verify that the
on-disk `.js` outputs actually exist. So once any event leaves `dist/` truncated
while the tsbuildinfo is intact — a partial GCS restore, an interrupted write, or
a previously-poisoned cache entry — the next `tsc --build` **no-ops** instead of
re-emitting the missing `.js`, and Nx re-caches the incomplete `dist/` under a
fresh hash. The key is permanently poisoned. (`__generated__`/codegen is a
separate, earlier vector; the 2026-07-29 case had no codegen inputs.)

> **Do NOT** "fix" this by dropping `tsbuildinfo` from the cache — that
> reintroduces the stale-`.d.ts` bug fixed in PR #212.

### Durable fix (in place)

`scripts/verify-dist-complete.ts` asserts every emitting source module has a
non-empty compiled `.js` in `dist/`. It is wired two ways on every `tsc --build`
package (agentic-utils, agentic-workflow, agentic-ralph, plan-config, drivers,
agentic-token-usage, skills, ide, node-client):

1. **Self-healing build** — the `build` command runs the guard and, on an
   incomplete dist, does `rm -rf dist && tsc --build …` (a `--force`-equivalent
   that also drops the stale tsbuildinfo) then re-verifies. A cache **write** can
   never store a truncated dist; a real compile gap fails the build fast.
2. **Consume-time gate** — a `verify-dist-complete` target (`cache: false`,
   `dependsOn: [build]`) always runs even on a build cache **hit**, so a
   pre-existing poisoned entry fails loudly with a clear message instead of a
   cryptic downstream `Cannot find module`. Run in `check:local` via
   `check:local:verify` (`nx run-many --target=verify-dist-complete --all`).

Not affected (audited): source-first packages with no build target
(`openthrottle-vscode`, `openthrottle-developer-codegen`, `openthrottle-mcp`) and
the React Router apps (`admin`/`email`/`website`/`developer`), which build via
`react-router build` (Vite) with no tsbuildinfo.

### Purge a poisoned key (manual recovery)

```bash
# 1. Identify the poisoned hash(es) from the failing task's cache metadata,
#    then remove the remote objects (staging bucket):
gcloud storage rm "gs://openthrottle-staging-nx-cache/nx-cache/<hash>" \
  "gs://openthrottle-staging-nx-cache/nx-cache/<hash>.commit"

# 2. Drop any local copies so a fresh build reseeds the key:
rm -rf .nx/cache && pnpm clean:tsbuildinfo
rm -rf packages/<name>/dist

# 3. Rebuild from clean; the self-healing build reseeds a complete artifact:
NX_ISOLATE_PLUGINS=false pnpm nx run @openthrottle/<name>:build --skip-nx-cache
```

Re-running the failed CI job after the purge self-heals (the guard now blocks a
re-poison).

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
  { "plugin": "./tools/nx-plugins/react-router-typecheck.ts" },
  { "plugin": "./tools/nx-plugins/package-typecheck.ts" }
]
```

Both infer a real `typecheck` target so the policy lives once at the workspace root instead of drifting per project:

- **`react-router-typecheck.ts`** — matches `applications/*/react-router.config.ts`. React Router apps are source-first (no dist emit), so the target runs `react-router typegen && tsc --noEmit` over source + tests, with `outputs: []`.
- **`package-typecheck.ts`** — matches projects with a `tsconfig.lib.json`/`tsconfig.app.json` (buildable packages and the NestJS server). The target runs `tsc --build --emitDeclarationOnly` (emitting dist `.d.ts` as outputs), then `tsc --noEmit -p tsconfig.test.json` when a test tsconfig exists.

`nx.json` `targetDefaults.typecheck` still layers `cache`/`dependsOn` (`^typecheck`) on top of what these plugins infer.
