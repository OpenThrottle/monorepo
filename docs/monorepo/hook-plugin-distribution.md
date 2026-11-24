# Hook plugin distribution — decision record

**Status:** ACCEPTED 2026-11-13 by visormatt (OT plan `88d08c18`, task 1 `33ad40b7`).
**Siblings:** [child-repo-hook-overlay.md](./child-repo-hook-overlay.md) (delivery legs A and B,
which this record keeps), [agent-cli-hook-capability-matrix.md](./agent-cli-hook-capability-matrix.md).

## The question

Committed hook bundles cause a lot of churn. Since OpenThrottle's audience is other repositories,
should the hooks ship as installable plugins, and should this repository consume them that way too?

**Short answer:** yes. The churn does not come from bundle _shape_, though. It comes from
_committing build output on every PR_. The fix is to stop committing it, not to bundle differently.

## 1. Baseline churn (measured 2026-11-13, last 60 days)

| measure                                                                          | value                               |
| -------------------------------------------------------------------------------- | ----------------------------------- |
| commits touching `.{claude,cursor,codex}/hooks/*.cjs` or `plugins/*/hooks/*.cjs` | 33                                  |
| bundle file-changes in those commits                                             | 274                                 |
| bundle lines changed                                                             | +33,383 / −8,421 (**41.8k**)        |
| non-test `packages/agentic-hooks/src` lines changed in the same commits          | 13.8k                               |
| amplification                                                                    | **~3× generated per authored line** |
| commits that changed **no** hook source (pure dependency reflow)                 | 6 of 33, 5.8k bundle lines          |

Measured with `git --attr-source=<empty tree>`, because `-diff` makes `--numstat` report the
bundles as binary.

**Reference case, PR #784.** The only behaviour change was in
`openthrottle-agentic-utils/.../codex/*`. Rebuilding just the Claude bundles from that diff
reproduces it exactly: 2 files, +370/−92. The plugin copy of `skill-usage-complete.cjs` makes it 3.
One of those 2 files, `session-trajectory-resegment.cjs`, is an operator CLI that no hook ever
registers.

## 2. Hook classification

| bundle                                                                      | kind                                             | blocks?                               | ships to child repos?                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `skill-usage-capture`, `skill-usage-complete`, `skill-usage-heartbeat`      | telemetry                                        | never                                 | **yes** — already in `plugins/openthrottle`                                              |
| `plan-run-janitor`, `plan-auto-close`, `plan-run-task-guard`                | OT plan-run workflow                             | no (context / settle only)            | **yes** — any repo driven by OT plans                                                    |
| `plan-inbox-claim`                                                          | OT plan-run workflow                             | **denies** once, on a claimed `STEER` | **yes** — any repo driven by OT plans                                                    |
| `require-ot-plan-kickoff`                                                   | OT plan workflow                                 | **denies** plan-less session kickoffs | yes, opt-in (opinionated)                                                                |
| `bash-guard` (zsh glob/modifier, BSD sed, masked exit, stale PR write)      | general guard, no OT or repo knowledge           | **denies** some commands              | yes, opt-in                                                                              |
| `memory-index-guard`                                                        | general Claude guard                             | no (context only)                     | yes, opt-in                                                                              |
| `skill-usage-doctor`, `skill-usage-drain`                                   | operator CLI                                     | —                                     | yes, as a plugin `bin/` executable                                                       |
| `skill-usage-outcome`                                                       | deliberate outcome reporter, run by skills       | never                                 | yes, as a `bin/` executable of the Claude, Codex and Cursor telemetry payloads           |
| `skill-usage-backfill`, `session-trajectory-resegment`, `skill-usage-scope` | operator CLIs / internals, registered as no hook | —                                     | **no** — run from source in the monorepo (`pnpm run telemetry:<name>`); no bundle at all |

None of the hooks is truly monorepo-only. The SSOT push denies come from `.agents/agent-config.json`
and are delivered by permissions plus the agy plugin, not by `bash-guard`. Only
`.cursor/hooks/format.sh` and the `WorktreeCreate` hook are repo-local, and both stay in-repo.

**Recommended split — three plugins per tool payload.** Install cost should scale with how
intrusive a plugin is:

- `openthrottle` — telemetry only (today's plugin). It never blocks and is safe to install anywhere.
- `openthrottle-workflow` — the plan-run hooks and `require-ot-plan-kickoff`. It depends on
  `openthrottle`, using Claude plugin `dependencies`, which install automatically.
- `openthrottle-guards` — `bash-guard` and `memory-index-guard`. It is useful with or without OT.

## 3. Bundle shape — measured, and not the lever

All shapes were bundled from the same 16 Claude entries, before and after the #784 dependency diff.
Every shape was deterministic across repeated builds. Hook latency is the mean of 10 runs of
`bash-guard` on an allow payload, against a bare `node -e 0` at 33 ms.

| shape                                        | outputs | size     | #784 diff                                | latency                          |
| -------------------------------------------- | ------- | -------- | ---------------------------------------- | -------------------------------- |
| **A** per-entry self-contained CJS (today)   | 16      | 565 KB   | 2 files, +370/−92                        | 36 ms                            |
| **C** ESM + code splitting, hashed chunks    | 33      | 314 KB   | **8 files, +2,358/−2,219**               | 38 ms                            |
| **C′** ESM splitting, hash-free chunk names  | —       | —        | esbuild refuses (`chunk.mjs` collisions) | —                                |
| **D** one dispatcher (`ot-hooks.cjs <hook>`) | 1       | 1,594 KB | 1 file, +205/−62                         | **56 ms** (+20 ms per hook call) |

- **C** is worse than today. A content change renames a chunk, and the rename rewrites the import
  specifiers in every chunk that references it.
- **D** wraps every module, which defeats tree shaking. It triples the size and adds about 20 ms to
  every Bash and Edit call.
- No shape gets an unrelated dependency change below "some generated file changes". Committed
  output churns whatever its shape.

**Decision:** keep shape A. It is simple, the fastest at startup, and it already passes the drift
gate. Task 2 shrinks to two changes:

- Drop the five operator CLIs from the bundle set.
- Ship `skill-usage-doctor` via `bin/`.

## 4. Hosting — stop committing bundles on `main`

Facts from the Claude Code plugin docs (fetched 2026-11-13; probed against 2.1.322 where noted):

- **Plugin sources.** A marketplace entry's `source` can be:
  - a relative path;
  - `github` (`repo`, `ref`, `sha`);
  - `url` / `git-subdir` (`url`, `path`, `ref`, `sha`);
  - `npm`, `archive` (`url` + `sha256`) or `command`.

  So a `marketplace.json` on `main` can point a plugin at another branch or tag.

- **Caching.**
  - Git-hosted plugins are copied into `~/.claude/plugins/cache/<mkt>/<plugin>/<version>/`.
  - A pinned manifest `version` keeps users on the cached copy until the version changes.
  - Relative-path plugins in a **local-directory marketplace load in place**: edits apply at the
    next session or `/reload-plugins`, with no version bump.
- **Plugin precedence.** `--plugin-dir` silently **replaces** a same-named installed plugin, so
  hooks never double.
- **Project settings.** `enabledPlugins` in `.claude/settings.json` does **not** install anything.
  A contributor runs `claude plugin install <p>@<mkt> --scope project` once.
  `extraKnownMarketplaces` applies only in a trusted folder, and a relative directory source
  resolves against the **main checkout**, not a worktree.
- **Releases.** `claude plugin tag` creates `<name>--v<version>` tags, and dependency version
  ranges resolve against them.

| option                                                                                                                              | `main` churn                                    | leg A (marketplace)                | leg B (`--plugin-dir`, plain checkout)                                                           | verdict              |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------- |
| (a) keep committing, only under `plugins/`                                                                                          | drops duplicate copies only (#784: 3 files → 2) | unchanged                          | unchanged                                                                                        | not enough           |
| **(b) gitignore `plugins/*/hooks/*.cjs`; CI publishes built payloads to a generated `plugins-dist` branch on each merge to `main`** | **zero**                                        | `git-subdir` + `ref: plugins-dist` | built by `bundle-hooks` as a `dependsOn` of the server/driver targets and in `Dockerfile.NestJS` | **recommended**      |
| (c) release-only `archive` zips                                                                                                     | zero                                            | lags until a release               | same as (b)                                                                                      | later, with 36d1ca31 |

**As shipped,** the gitignored directory is `plugins/*/dist/`, built by `pnpm run build:hooks`. That
runs in setup, worktree provisioning, openthrottle-server `dev` and the husky `post-merge` and
`post-checkout` hooks. `.github/workflows/publish-plugins.yml` publishes it.

Under (b), these files stay committed on `main` because they are small and rarely change:

- `plugin.json`, `hooks/hooks.json`, `README.md`;
- a tiny fixed **stub** per hook and CLI in `hooks/` and `bin/`. It `require`s `dist/<file>` if the
  bundle is built and otherwise exits 0, so an unbuilt checkout stays fail-open instead of erroring.
  The bundles themselves live in the gitignored `dist/`.

`bundle-hooks-check` (byte-for-byte drift) becomes a build plus smoke test. The `.gitattributes`
entries for hook bundles go away.

**Versioning.** The dist publish must change `version` whenever the payload changes, or cached users
never update. Options:

- derive it from the package version plus a build counter;
- a real bump per release, via Nx release groups in 36d1ca31.

Task 5 must also verify how Claude treats semver build metadata such as `1.3.0+abc123`. The docs do
not say.

**Other CLIs under (b):**

| CLI            | change                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| Cursor         | Payload unchanged in shape, and `--plugin-dir` still works.                       |
| Codex          | It has no `--plugin-dir`. Its marketplace entry gets the same `plugins-dist` ref. |
| Antigravity    | Its workspace plugin under `.agents/plugins/` points at the built payload.        |
| grok, opencode | Out of scope, as today.                                                           |

**Vercel must skip `plugins-dist`.** Vercel's Git integration deploys every pushed branch, and it
reads `vercel.json` from the deployed branch's Root Directory, not from `main`. `plugins-dist` has
no `applications/` folders, so before this was handled every publish produced a failed preview
("Root Directory … does not exist") on each Vercel project linked to the repo. The `main` copy of
`git.deploymentEnabled` cannot prevent that. `assemble-plugins-dist.ts` therefore writes
`{"git":{"deploymentEnabled":false}}` to the branch root and to every `applications/<app>/`
folder, derived from `main`'s `applications/` directory so a new app is covered automatically.
Vercel then finds the Root Directory and skips the branch. The stubs sit outside `plugins/`, so
marketplace installs never see them.

## 5. Dogfooding — this repo consumes its own plugins

- **Claude.**
  - Replace the eleven hook registrations in `.claude/settings.json` with a local-directory
    marketplace plus `enabledPlugins`. Shipped as the generated
    `plugins/.claude-plugin/marketplace.json` (name `openthrottle-dev`, relative sources, loaded in
    place); the first draft was a root marketplace with source `./`.
  - Plugins load in place, so a rebuilt bundle applies at the next session with no
    `/plugin update`.
  - `scripts/setup.sh` and worktree provisioning run the one-time
    `claude plugin install … --scope local` and `bundle-hooks`. Local scope records the checkout's
    path in `~/.claude/plugins/installed_plugins.json` and writes the gitignored
    `.claude/settings.local.json`. Project scope would rewrite the committed settings file.
  - **Removal is the other half of the same registry entry**
    ([the rule](./agent-editor-folders.md#per-checkout-registrations-ship-with-their-removal)).
    Worktree teardown (`scripts/teardown_worktree.ts`) runs
    `claude plugin uninstall <p>@openthrottle-dev --scope local --keep-data` from the worktree,
    dependents first and `openthrottle` last. `--keep-data` is required because
    `~/.claude/plugins/data/<id>/` is shared by every checkout's install. Only `@openthrottle-dev`
    ids are named, so the public `@openthrottle` user-scope install is never touched, and the
    primary checkout is never unregistered.
  - **The sweep.** `pnpm worktree:prune-agents [--dry-run]` (also run best-effort by `setup.ts`)
    reads `installed_plugins.json` read-only. For each `@openthrottle-dev` local install whose
    `projectPath` is gone, it recreates the empty directory, runs the same uninstall inside it,
    and deletes only the directory it created. It skips an orphan nested in another git checkout,
    because the CLI could resolve the enclosing repository and unregister that instead.
  - Orphaned cache versions under `~/.claude/plugins/cache/openthrottle-dev/` (about 0.9 MB) are
    left to Claude Code to collect.
  - `OPENTHROTTLE_CLAUDE_PLUGINS=0` opts out of install, removal and the sweep.
- **Testing a branch's own hooks.** A directory source resolves against the main checkout, so a
  worktree session runs `main`'s plugin. To exercise a branch's own hooks, run
  `claude --plugin-dir ./plugins/<p>`. That flag replaces the installed copy, and OT-driven runs
  already pass it (leg B).
- **Cursor, Codex, Antigravity.** Their in-repo configs point at the single built payload under
  `plugins/<tool-payload>/` through the stubs. Every `.{claude,cursor,codex}/hooks/*.cjs` copy is
  deleted. The changes go through `.agents/agent-config.json`.

**Rejected alternative:** point `.claude/settings.json` hook commands straight at
`plugins/openthrottle/hooks/*`. It needs no install step and follows the worktree. But it never
exercises `hooks.json` or `${CLAUDE_PLUGIN_ROOT}`, which is the code path our users actually run.
It would also double-fire for anyone who installed the public plugin as well.

## 6. Decisions (owner, 2026-11-13)

1. **Hosting:** (b). Bundles are gitignored on `main`, and a generated `plugins-dist` branch is
   published by CI on every merge to `main`.
2. **Plugin split:** three plugins per tool payload — `openthrottle`, `openthrottle-workflow`,
   `openthrottle-guards`.
3. **Claude dogfooding:** a local-directory marketplace plus `enabledPlugins`, and
   `--plugin-dir` for branch testing.

## 7. Amendments to later tasks

| task     | change                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2**    | No new bundle shape. Remove the five operator CLIs from `BUNDLES` and run them from source. Ship `skill-usage-doctor` via `bin/`. Add a fixed stub per hook (shipped instead of `hooks/run.cjs`). |
| **3**    | Build the three plugin payloads per tool, with `dependencies` wiring.                                                                                                                             |
| **4**    | Use the directory marketplace plus a one-time install in setup and provisioning.                                                                                                                  |
| **5**    | Required, not conditional: the `plugins-dist` publish job, `git-subdir` marketplace entries (Claude and Codex), the build `dependsOn` and Docker build step, and the versioning rule.             |
| **6, 7** | Unchanged.                                                                                                                                                                                        |
