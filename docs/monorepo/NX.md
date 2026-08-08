# 🐙 NX

This monorepo uses **Nx** for task orchestration and caching, and **pnpm** for workspace dependency management.

## Repo conventions (high signal)

- **Package manager**: use `pnpm` (enforced by `preinstall`).
- **Nx config style**: projects are primarily **inferred** via each project’s `package.json` `nx` block (not `project.json`).
- **Tags**: projects are expected to have at least one `technology:*` tag, plus `type:*` and `name:*` tags in most cases.
  - See `docs/monorepo/NX/tags.md`.
  - Validate with `pnpm nx:validate-tags`.
- **Caching**: remote caching is configured via `@nx/gcs-cache` against a single self-hosted GCS bucket (`openthrottle-staging-nx-cache`) with `localMode: "read-only"` everywhere. Main-branch CI does **not** currently populate the remote cache, so it is effectively cold — a documented status-quo tradeoff (see [Operational decisions](#operational-decisions-2026-07-21)).
  - Setup notes: `docs/infra/gcs-nx-cache-verify.md`.
- **CI patterns**: CI uses `nx affected` and distributes work using `scripts/parallelize-tasks.ts`. Gate priorities (P0–P4), owners, and job mapping: [CI-quality-gates.md](./CI-quality-gates.md).
- **Dependency graph**: `scripts/nx-dependency-graph.ts` generates a static `dependency-graph.html` artifact; a scheduled workflow commits snapshots under `docs/nx/dependency-graphs/`.
- **`pnpm sync` vs `nx sync`**: despite the shared name, these are unrelated. `pnpm sync` runs the root `sync:openthrottle:*` scripts (`scripts/sync-subtree.sh`), a **git subtree sync** of vendored application content. `nx sync` is Nx's **TypeScript project-reference tsconfig sync** — do **not** run it in this repo; it can inject bogus cross-project tsconfig references and break React Router app typechecks. The `@nx/js:typescript-sync` generator is now **disabled workspace-wide** so it can no longer gate targets — see [tsconfig references & the disabled sync generator](#tsconfig-references--the-disabled-sync-generator).

### Operational decisions (2026-07-21)

Recorded from the Nx implementation audit:

- **Remote cache writes — status quo.** The GCS cache stays `read-only` everywhere and main CI does not write entries, so cross-run cache hits are unavailable and the remote cache is effectively cold. The "two-bucket CREEP-safe model" (CVE-2025-36852) was never actually wired — every staging/production ternary in the workflows and `scripts/gcs-nx-cache-*.sh` resolves to the same `openthrottle-staging-nx-cache` bucket. Accepted for now; revisit (single-bucket main-only writes, or the real two-bucket model) if cache misses become a CI-time problem.
- **Nx Cloud — not adopted.** The workspace stays on self-hosted `@nx/gcs-cache`. The CI sharding infra (`scripts/parallelize-tasks.ts`, the matrix, the `merge_group` trigger) is built but pinned to a single runner as a deliberate cost tradeoff; **enable it when CI wall-time regularly approaches the 15-minute job timeout** (rough trigger: sustained > ~12 min). Distributed task execution, the test atomizer, flaky-task retries, and self-healing CI remain unavailable. The `monitor-ci` agent skill depends on Nx Cloud; it self-detects the missing connection (its "Step 0") and reports itself inoperable here, so it is a no-op until/unless Nx Cloud is adopted.
- **Releases — manual only.** `nx release` stays invocable via the `workflow_dispatch`-only `nx-release.yml`; the duplicate commented-out release job in `continuous-integration.yml` has been removed. Nothing is `publish:true` today (nothing is being published), so there is no automated release on `main`. Flip a package to `publish:true` and revisit if publishing resumes.

### tsconfig references & the disabled sync generator

`nx.json` sets:

```json
"sync": {
  "applyChanges": true,
  "disabledTaskSyncGenerators": ["@nx/js:typescript-sync"]
}
```

**Why it's disabled.** The custom `tools/nx-plugins/package-typecheck.ts` plugin
owns the `typecheck` target and re-attaches `syncGenerators: ['@nx/js:typescript-sync']`,
so before this change the tsconfig-reference sync gate fired on _every_
`{applications,packages,tools}/*` typecheck. In a non-TTY shell (fresh worktrees,
plain `bash -c`) `sync.applyChanges` cannot auto-apply — Nx has no TTY to apply
into — so Nx **hard-failed the target** with `NX The workspace is out of sync …
[@nx/js:typescript-sync]` before it ran. That made a freshly-provisioned worktree
unusable until someone ran `nx sync` by hand. On Nx 22.7.4 the generator also emits
**phantom cross-references between the React Router apps** (developer/website/admin →
email, admin → developer) — `type: static` graph edges backed by no import, no
tsconfig ref, no `paths` entry, unstable run-to-run ([Nx #36297](https://github.com/nrwl/nx/issues/36297)).
So the generator could only produce noise or breakage here; disabling the gate is
the durable fix.

`disabledTaskSyncGenerators` disables **only** the tsconfig-ref sync gate. It does
**not** touch `pluginsConfig.@nx/js.analyzeSourceFiles: true`, so the project-graph
edges that drive `nx affected` and `^build`/`^typecheck` ordering are fully intact
(verified: `nx affected` still resolves the full set and `openthrottle-server:build`
still orders its 41 upstream `^build` deps). This is fundamentally different from
`analyzeSourceFiles: false`, which _would_ drop ~85 real edges — never set that.

**Never run bare `nx sync`.** tsconfig `references` are maintained **by hand**.

**Reconciling a real reference by hand.** When a project starts importing a sibling
workspace package (adds `@openthrottle/<pkg>` to `package.json` + an `import`), add
the matching project reference to that project's `tsconfig.json` `references` array,
e.g.:

```jsonc
{ "path": "../../packages/react-router-<pkg>" }
```

To _find_ genuine drift without ever gating work, run the opt-in, non-blocking:

```bash
pnpm run check:tsconfig-refs
```

It runs the sync generator in a throwaway pass (auto-restoring the tree), filters
out the phantom app→app edges, and prints only real missing/stale references. It is
**not** part of `check:local` and is never a required CI status.

**Sibling fix.** Worktree `.env`/DB-seeding friction is handled separately by the
tool-agnostic worktree provisioning work (OT `c9545bb0`); this sync-gate fix and
that provisioning fix together make a fresh worktree usable immediately.

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
