# Foreign-workspace skill injection

**Related:** [agent-editor-folders.md](./agent-editor-folders.md), `skills/ot-skill-sync/scripts/` (the in-repo SSOT fan-out this extends), `packages/openthrottle-drivers/src/drivers/` (the supported CLI set §2 is measured against). Implementation: `packages/openthrottle-agentic-utils/src/utils/foreign-skill-injection/`.

**Sibling — read alongside:** [child-repo-hook-overlay.md](./child-repo-hook-overlay.md) solves the same problem for **hooks**, and reaches the OPPOSITE conclusion for a concrete reason: §2 below establishes that no CLI exposes an out-of-repo skills directory **as a flag or env override** — the two config-file pointers that do exist (`agy`'s `.agents/skills.json`, opencode's `opencode.json`) live in tracked files inside the target repo, so they fail the non-mutation guarantee rather than supplying an out-of-repo hook-style escape. That is what forces materialization here. Every CLI we support _does_ expose out-of-repo hook config, so hooks are never written into a target repo. Do not generalize this doc's approach to hooks.

## What injection does

OpenThrottle's downstream value is its curated skill set (`ot-plans`, `nx-workspace`, the `openthrottle-*` skills, …). When OT drives an agent CLI in a **foreign workspace** — any checkout outside the OT monorepo, e.g. a consumer's `ssm-data-pipeline` — those skills are absent, because every CLI discovers skills only from directories inside the working tree (§2).

Injection makes OT's curated skills a **layered, non-mutating, server-scoped** base projected INTO the foreign repo while the OT server runs, reused across runs, and reconciled on shutdown/boot. It extends the ot-skill-sync SSOT/fan-out (`skills/<name>` → `.agents/skills/<name>` → per-agent dirs) to a third, **external** target; the in-repo fan-out itself is unchanged, and gains only another consumer of the same SSOT.

The prompt layer (`buildForeignWorkspacePromptLayer`, `packages/openthrottle-agentic-utils/src/utils/foreign-workspace-context.ts`) is reconciled against the injected manifest rather than telling the agent to avoid OT skills.

---

## 1. Precedence — three layers, target repo wins

Layering low → high (higher masks lower on a name collision):

```
OT curated (<OT_ROOT>/skills/)      ← base; always present when the server runs
        <  personal / experimental  (per-user dir, opt-in, default OFF)
        <  target repo's own skills  (.agents/skills + .claude/skills already in the checkout)
```

**Rule:** OT skills are a BASE that fills gaps. Any skill _name_ the target repo already defines is **excluded from the manifest entirely** and never masked — the resolver drops it before anything is materialized (target-wins is enforced at resolve time, not by letting our link lose a race on disk).

### Worked example — target repo redefines `create-readme`

Sources:

- OT curated: `create-readme`, `ot-plans`, `nx-workspace`, `frontend-design`
- personal dir (opt-in, present): `create-readme` (the user's experimental variant), `my-spike`
- target repo `.agents/skills/`: `create-readme` (the repo's own house-style version), `deploy-prod`

Resolved manifest (ordered, de-duplicated by name):

| name              | winning source  | materialized? | why                                                                             |
| ----------------- | --------------- | ------------- | ------------------------------------------------------------------------------- |
| `create-readme`   | **target repo** | **no**        | target owns the name → excluded from manifest; the repo's own copy is untouched |
| `ot-plans`        | OT curated      | yes           | gap-fill                                                                        |
| `nx-workspace`    | OT curated      | yes           | gap-fill                                                                        |
| `frontend-design` | OT curated      | yes           | gap-fill                                                                        |
| `my-spike`        | personal        | yes           | gap-fill; personal-only name                                                    |
| `deploy-prod`     | target repo     | no            | target-owned; already on disk                                                   |

Note the personal `create-readme` also loses — not because personal < OT, but because the _name_ is target-owned, and target-owned names are dropped before the personal-over-OT merge even matters. Personal-over-OT precedence only decides collisions **between the two injected layers** (e.g. if `ot-plans` existed in both the personal dir and OT curated, the personal copy would win the manifest slot).

---

## 2. Placement — `.agents/skills/` + `.claude/skills/`, forced by CLI reality

> **Measured 2026-08-26** against the installed binaries/bundles, read off each CLI's own path constants and shipped docs. **Re-verify before changing the target set, and whenever any of these CLIs ships a release** — every one of these facts goes stale silently. The **discovery** facts are shared with ot-skill-sync's in-repo fan-out (`skills/ot-skill-sync/SKILL.md` § "Which CLI reads what") and must stay in sync; the **coverage** facts are per-consumer and deliberately differ — see the two tables below.

Every agent CLI discovers skills **only from directories inside the working tree** (plus, for most, a global user dir — rejected below). None exposes an out-of-repo `--skills-dir` flag or env override, which is what forces materialization into the foreign repo.

Two different consumers write these dirs, and the doc used to blur them — which made the gap list read wrong. Keep them apart:

- **In-repo fan-out** (`ot-skill-sync`, `skills/ot-skill-sync/scripts/sync.sh`) — inside the OT monorepo. Its targets are configurable, and it gained `.gemini/skills` on 2026-08-26.
- **Foreign injection** (this record) — the server materializing into someone else's checkout. Its targets are hardcoded to `.agents/skills` + `.claude/skills`.

So a CLI can be covered in-repo and still uncovered in a foreign repo. `gemini` is exactly that case today.

### What each CLI actually reads

| CLI                | binary         | version    | `.agents/skills` | `.claude/skills` | `.gemini/skills` | its own in-repo dir                  |
| ------------------ | -------------- | ---------- | :--------------: | :--------------: | :--------------: | ------------------------------------ |
| Claude Code        | `claude`       | 2.1.232    |        —         |        ✅        |        —         | —                                    |
| Cursor CLI         | `cursor-agent` | 2026.08.11 |        ✅        |        ✅        |        —         | `.cursor/skills`, `.codex/skills`    |
| Grok Build         | `grok`         | 1.0.5      |        ✅        |        ✅        |        —         | `.grok/skills`, `.cursor/skills`     |
| Google Antigravity | `agy`          | 1.1.21     |        ✅        |        —         |        —         | — (global `~/.gemini/config/skills`) |
| Gemini CLI         | `gemini`       | 0.25.2     |        —         |        —         |        ✅        | `.gemini/skills`                     |
| Codex CLI          | `codex`        | 0.145.0    |        —         |        —         |        —         | — (global `$CODEX_HOME/skills` only) |
| OpenCode           | `opencode`     | 1.18.16    |        —         |        —         |        —         | `.opencode/skill(s)`                 |

### Coverage — and the two remaining gaps

| CLI                | in-repo fan-out         | foreign injection            | to close it                              |
| ------------------ | ----------------------- | ---------------------------- | ---------------------------------------- |
| Claude Code        | ✅ `.claude/skills`     | ✅ `.claude/skills`          | —                                        |
| Cursor CLI         | ✅ `.agents/skills`     | ✅ both dirs                 | —                                        |
| Grok Build         | ✅ `.agents/skills`     | ✅ both dirs                 | —                                        |
| Google Antigravity | ✅ `.agents/skills`     | ✅ `.agents/skills`          | — (native, no fan-out needed)            |
| Gemini CLI         | ✅ **`.gemini/skills`** | ❌ not a materializer target | add `.gemini/skills` to the materializer |
| **OpenCode**       | ❌ **gap**              | ❌ **gap**                   | add `.opencode/skill` to both            |
| **Codex CLI**      | ❌ **gap, unclosable**  | ❌ **gap, unclosable**       | nothing in-repo works — global dir only  |

**The two open gaps are OpenCode and Codex.**

- **OpenCode** — reads `.opencode/skill(s)/<name>/SKILL.md` in-repo. Closable in both consumers by adding `.opencode/skill` as a target; already supported in the fan-out as a one-line `AGENT_SKILL_DIRS` override, just not a default. This is a decision, not a blocker.
- **Codex** — **cannot be closed by any in-repo mechanism.** 0.145.0 reads skills only from `$CODEX_HOME/skills` (`~/.codex/skills`). There is no project dir to write, so neither the fan-out nor injection can ever reach it without accepting a global dir, which is rejected below. Any future codex skills support needs a different mechanism entirely.

**Gemini is no longer an unsolved question, only unfinished work.** The in-repo fan-out already writes `.gemini/skills` and the approach is proven — the target dir, its symlinks, and its managed `.gitignore` handling are all exercised in this repo — so extending the materializer with the same third dir is mechanical rather than exploratory.

Injecting into **both** dirs reaches four of the seven with no per-CLI branching, and remains the right base: it is the union that covers the most CLIs per directory written, and it mirrors ot-skill-sync's own two-stage layout (`.agents/skills` as the universal view, `.claude/skills` as an agent fan-out target).

### Why the coverage lands where it does

- **claude does NOT read `.agents/skills`.** Verified against 2.1.232: `.claude/skills` is its only in-repo skills dir (`.agents` appears there only in unrelated SDK/plugin symbols). The `.claude/skills` half of the union is therefore load-bearing for Claude Code itself, not merely a Grok/Cursor convenience.
- **codex does NOT read `.agents/skills`** — nor any in-repo dir. 0.145.0 discovers skills only under `$CODEX_HOME/skills` (`~/.codex/skills`); its `.agents/` handling is plugin-marketplace manifests. **No in-repo injection can reach codex**, so codex-driven foreign runs cannot get OT skills by this mechanism at all. (Cursor's scan of `.codex/skills` is Cursor's compat behavior, not codex's own.)
- **opencode does NOT read in-repo `.agents/skills`.** 1.18.16 reads project skills from `.opencode/skill(s)/<name>/SKILL.md`; its "external" auto-scans are **home-scoped only** (`~/.claude/skills`, `~/.agents/skills`, disableable via `OPENCODE_DISABLE_EXTERNAL_SKILLS`).
- **grok DOES read `.agents/skills`.** Per its own shipped docs it "scans `.agents/skills/` (and `commands/`) at each tier," walking from cwd to repo root, alongside `.grok/`, `.claude/`, and `.cursor/`.
- **cursor** reads `.cursor/skills`, `.claude/skills`, `.codex/skills`, and `.agents/skills`.

### Antigravity (`agy` 1.1.21) — covered for free, no new dir

The Antigravity CLI (see `packages/openthrottle-drivers/src/drivers/antigravity.ts`) discovers workspace skills from **`<workspace>/.agents/skills/<name>/`**, plus a global `~/.gemini/config/skills/<name>/`. The existing `.agents/skills` injection therefore reaches it with **zero changes to the materializer** — the one CLI the two-dir union covers natively.

Two traps, both following from Antigravity being a ground-up Go rewrite that merely reuses the `~/.gemini` prefix:

- **`agy` has nothing to do with `.gemini/skills`.** That is the _Gemini CLI's_ project dir. Antigravity's global scope is `~/.gemini/config/skills`, a different layout under the same prefix. Adding `.gemini/skills` for gemini does not serve `agy`, and satisfying `agy` does not serve gemini.
- **`agy` supports an `.agents/skills.json` manifest** whose entries accept absolute and `~`-prefixed `path` values — the only out-of-repo skills _pointer_ found in any supported CLI. It does not rescue the design: the manifest is a **tracked file in the target repo**, so writing it would break the non-mutation guarantee (§4), and its global twin (`~/.gemini/config/skills.json`) is rejected below as a global. Recorded so any future revisit starts from the facts. (opencode's `opencode.json` `skills.paths` accepts absolute paths and draws the same tracked-file objection.)

**Gemini discovery detail (0.25.2, from the shipped source):** gemini reads `.gemini/skills` (project scope — `Storage.getProjectSkillsDir()` returns `<targetDir>/.gemini/skills`) and `~/.gemini/skills` (user scope). The user scope is rejected below with the other globals, so the project dir is the only viable target.

### Rejected: global user dirs (`~/.claude/skills`, `~/.grok/skills`, …)

Considered and rejected. They are (a) **non-uniform** across CLIs (each CLI names its global dir differently and some have none), and (b) **permanently global** — they would leak OT skills into _every_ repo the user touches and _every_ interactive session, overshooting the requirement of "visible while the OT server runs, scoped to the repos OT actually drives." In-repo injection with a lifecycle we own is the only mechanism that is both uniform and bounded.

---

## 3. Lifecycle — server-scoped, per-repo (not run-scoped ephemeral)

CLIs only discover skills from in-tree dirs (no out-of-repo pointer), and the property we want is "OT skills present and visible **while the server is running**." So the layer's lifetime tracks the **server**, not the run — deliberately not the run, and not run-scoped ephemeral.

- **Materialize on toggle (apply now, per-repo):** flipping the per-checkout injection switch on projects the layer into every one of that user's checkouts of the repository **immediately**, without waiting for a run; flipping it off removes it. `ForeignSkillMaterializationService.applyForRepository` (`applications/openthrottle-server/src/services/foreign-skill-injection/foreign-skill-materialization.service.ts`), called from `WorkspaceFoldersService`. This is what makes the layer usable by a **human** — someone who opts a repo in and then opens Claude Code in it themselves gets OT's skills there, with no OT-driven run in the picture. Per-checkout soft-fail; the settings mutation still succeeds.
- **Materialize on run start (lazy backstop, per-repo):** on any foreign run that touches a given repo. `ensureMaterialized(repo)` is **idempotent** — a cheap no-op when the layer is already present — so it is safe to call at the start of every run and is **reused across all subsequent runs** at zero per-run setup cost. This is the backstop that restores the layer after a server restart cleared it, and covers worktrees created after the toggle was flipped.
  - **Insertion point:** `AgenticRalphOrchestratorService.runPlanOrchestratorJob` (`applications/openthrottle-server/src/queues/agentic-ralph/agentic-ralph-orchestrator.service.ts`), immediately after `getWorkflowConfigCwd(...)` and alongside the existing soft-fail `maybeRegisterWorktreeCheckout({ filesystemPath: configCwd })`. This runs exactly once per server-side run, before `orchestrator.execute`. It is the single foreign-workspace choke point on the server path.
  - The detached-CLI path (`tools/workflows/src/bin/ralph.ts`) runs _inside_ the foreign checkout already; it is out of scope for server-managed injection (the user owns that tree). Server-orchestrated runs are the target.
- **Teardown (server shutdown):** on `OnApplicationShutdown` (already wired via `app.enableShutdownHooks(['SIGTERM','SIGINT'])` in `applications/openthrottle-server/src/main.ts`). Teardown removes exactly and only the ledger-recorded paths and their `.git/info/exclude` entries. Teardown is **NOT** per-run — a run finishing does not remove the layer, because the next run reuses it.
- **Boot reaper (missed teardowns):** see §4. A crash means shutdown teardown never ran, so a startup sweep reconciles stranded ledgers.

Materialize triggers: **toggle on** (apply now) + **run start** (idempotent ensure). Teardown triggers: **toggle off** (apply now) + **server shutdown** (graceful) + **boot reaper** (crash recovery). Not: run terminal states.

- **Boot reconcile (restart recovery):** immediately after the boot reaper, every checkout still flagged for injection has its layer re-projected — `ForeignSkillMaterializationService.remateralizeEnabledCheckouts`, called from `PlanRunsStaleSweepRepeatableService.onModuleInit`. Order is load-bearing: reap clears stranded ledgers, reconcile rebuilds what the flags say should exist; reversed, the reap would delete what reconcile had just built. Without this the flag and the disk disagree after every restart, and a user who opted a repo in would find OT's skills missing until their next run or toggle. Per-checkout soft-fail, and the whole step is wrapped so an unreachable repo cannot block boot.
  - Inherits the reaper's role gating (`PROCESS_ROLE` worker/all, where `PlanRunsStaleSweepQueueModule` loads) — deliberately, so reap and reconcile always run in the same process.

---

## 4. Non-mutation — symlink/copy + `.git/info/exclude` + per-repo ledger

The injected layer lives inside the **user's** repo. The guarantee: **the target repo's tracked files are never modified, and `git status` is clean at all times** — not merely after a successful teardown.

Three mechanisms, all required:

1. **Symlink (host) / copy (container)** into `.agents/skills/<name>` and `.claude/skills/<name>`. Never overwrite an existing entry (target-owned skills are already excluded at resolve time, but the materializer double-checks and skips any pre-existing path).
2. **`.git/info/exclude`** — the repo-local, **untracked** git exclude file — gets one managed, marker-bracketed block naming the injected paths, so `git status` never shows them. We use `.git/info/exclude` specifically and deliberately, **NOT**:
   - the tracked **`.gitignore`** (editing it mutates a tracked file → dirties `git status`, and could land in the user's commits), nor
   - a global **`core.excludesFile`** (leaks OT's ignore rules into every repo on the machine and risks masking real files elsewhere).
3. **Per-repo ledger** — a JSON file (outside the target repo, keyed by repo id/path) recording every created path and its mode (`symlink` | `copy`), plus the `.git/info/exclude` block marker. This is the authoritative record for **teardown** and the **boot reaper**.

### Why `git status` stays clean without relying on teardown

Cleanliness is a property of the **exclude block**, which is written _atomically as part of_ `ensureMaterialized` **before** (or in the same operation as) the links appear to any observer, and lives in an untracked file. So at every observable moment — before, during, and after a run, and even if the process is killed mid-run — the injected paths are excluded and no tracked file has changed. Teardown/reaper are about _removing_ the (already-invisible) links so they don't accumulate; they are not what keeps `git status` clean. This is the key difference from a teardown-dependent design.

### Ledger vs. ot-skill-sync's ownership-by-type

ot-skill-sync needs **no side-ledger**: inside `.agents/skills/` a real directory is external (lockfile-owned) and a symlink is ot-skill-sync's own — ownership is read straight off the on-disk type, and a static `.gitignore` block covers all generated links. That works because ot-skill-sync operates _within one repo_ where it authoritatively owns the symlinks.

Our case is different and **needs an explicit ledger** because:

- The source (`<OT_ROOT>/skills/<name>`) is **outside** the target repo, so our symlinks are absolute/out-of-tree — the very kind ot-skill-sync's own walker _skips_ as "not mine." We cannot rely on the target repo's own tooling to recognize or preserve them.
- In **container/copy mode** the injected entries are _real directories_, indistinguishable by type from target-owned skills — ownership-by-type breaks down entirely, so we need a recorded fingerprint.
- Crash recovery across a server boundary must remove _exactly_ what we created and nothing the user has since added; only an explicit per-path record makes that safe.

The **reaper safety rule:** remove a ledgered path only if it is _still_ identifiably OT-injected — a symlink still pointing at the OT/personal source, or a copy still matching the ledgered fingerprint. Never delete a target-owned or user-created file, even under a stale ledger.

---

## 5. Where the code lives

**Reused as-is:**

- `packages/openthrottle-skills` for discovery + frontmatter parsing: `walkAgentAssetFiles` / `parseSkillFrontmatter` / `skillFrontmatterSchema`. No new frontmatter parser.
- `packages/openthrottle-agentic-utils/src/utils/workspace-paths.ts`: `getWorkspacePathMapping` / `toContainerPath` / `toHostPath` to detect container mode and translate paths.
- `getOpenThrottleRoot(env)` (`workflow.ts`) to locate `<OT_ROOT>/skills/` (the curated SSOT) and `resolveForeignWorkspaceContext` to detect foreign runs.
- The stale-sweep lifecycle (`PlanRunsStaleSweepProcessor`, `PlanRunsService.findStaleInProgressRuns` / `settleStaleRun`, `enableShutdownHooks`) as the **host** for the boot reaper and shutdown teardown — we ride it, not build a bespoke marker system.

**Reused as a pattern, re-implemented in TypeScript rather than shelling out to the bash:** ot-skill-sync's _concepts_ — ordered manifest, collision precedence, marker-bracketed managed ignore block, idempotent ensure/cleanup. We do **not** call `skills/ot-skill-sync/scripts/*.sh` because it (a) edits the tracked `.gitignore` (we need `.git/info/exclude`), (b) assumes the SSOT is in the same repo, and (c) has no cross-server teardown/reaper. The materializer is server-side TS.

**Written for this layer:**

- **Resolver** (`packages/openthrottle-skills`): pure function `skills/` + personal-dir → ordered, de-duped manifest with source-layer provenance, excluding target-repo-owned names. No filesystem mutation.
- **Materializer + ledger + exclude manager** (`packages/openthrottle-agentic-utils`): `ensureMaterialized(repo)` / `teardown(repo)`, the per-repo ledger reader/writer, and the `.git/info/exclude` block manager.
- **Personal-tier config/discovery** (`packages/openthrottle-agentic-utils`): opt-in per-user dir → resolver middle layer.
- **Wiring**: the `runPlanOrchestratorJob` ensure call, the `buildForeignWorkspacePromptLayer` reconcile, the boot reaper + shutdown teardown providers.

Dependency direction: `agentic-utils` → `openthrottle-skills` (skills has only `yaml`+`zod` deps; no cycle).

---

## 6. Container path-mapping — copy, not symlink

When the workspace path-mapping bridge is active (`getWorkspacePathMapping(env)` returns a mapping — both `OPENTHROTTLE_HOST_WORKSPACES_DIR` and `OPENTHROTTLE_CONTAINER_WORKSPACES_DIR` set), OT runs in a container with the consumer's workspace bind-mounted, but `<OT_ROOT>/skills/` lives on a **different mount namespace**. A symlink into the target repo would point at a path that doesn't resolve inside the container (or resolves to the wrong thing on the host). So in that mode the materializer writes **copies** of the skill directories (fingerprinted in the ledger) instead of symlinks; the ledger records `mode: 'copy'`. **Host-run mode** (no mapping) stays **symlinks** (`mode: 'symlink'`), which are cheaper and self-evidently OT-owned.

The copy-vs-symlink decision is made once per `ensureMaterialized` from `getWorkspacePathMapping(env)`; the reaper/teardown read the recorded `mode` per path rather than re-deriving it.

---

## Non-mutation guarantee (summary)

> At no observable point does OT's skill injection modify a tracked file in the target repo or leave `git status` dirty. Injected entries live in the **resolved** locations of `.agents/skills/`/`.claude/skills/` and are hidden via the untracked `.git/info/exclude`; a per-repo ledger records exactly what was created (path + mode + fingerprint) so shutdown teardown and the crash-recovery boot reaper remove precisely those entries and nothing else. Target-owned skill names are excluded from the manifest before materialization, so the repo's own skills are never masked or touched.

**The word "resolved" is load-bearing, and this guarantee did not hold before 2026-08-28.** A target dir can itself be a symlink into the repo's own tracked space — `.claude/skills -> ../skills` is a real legacy layout, the one `ot-skill-sync`'s `ensure_agent_skill_dir` exists to undo. `existsSync` follows symlinks, so the injector never noticed: it wrote _through_ the link into tracked space while recording and excluding the **un-followed** path. The exclude patterns then matched nothing and the target repo's `git status` went dirty. See §4a and OT plan `b409da6e`.

The condition under which the guarantee holds is therefore explicit: **every target dir must resolve to a location inside the repo.** One that resolves outside is refused, not injected — `.git/info/exclude` patterns are worktree-relative, so such a path could never be hidden and no amount of bookkeeping would make injecting there clean.

---

## 4a. Target-dir resolution (added 2026-08-28)

**Decision (2026-08-28, OT plan `b409da6e` task 1): resolve the target dir, record and exclude the resolved repo-relative path; refuse only when it escapes the repo.** Recorded here in the same style as the 2026-08-26 CLI-matrix correction — the decision changed, the surrounding design did not.

`resolveTargetDirs` (in `materialize.ts`) resolves each entry of `FOREIGN_SKILL_TARGET_DIRS` before anything is written, so the **recorded** path, the **excluded** path and the **on-disk** path are the same string. Three behaviors:

| Case                          | Behavior                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Dir does not exist yet        | Not resolved — created in place, as itself. The common case; unchanged.                          |
| Dir resolves inside the repo  | Its resolved repo-relative path is used everywhere (inject, ledger, exclude, target-owned scan). |
| Dir resolves outside the repo | **Refused**, with a warning naming the target. The other target dir is still injected.           |

Two details that are easy to get wrong, both learned the hard way:

- **The repo root must be resolved too.** On macOS a repo under `/var/...` really lives at `/private/var/...`; comparing a resolved target against an unresolved root classifies every dir as "outside" and refuses everything.
- **`scanTargetOwnedSkillNames` must move with the ledger.** It builds keys from the target dirs and matches them against the ledger's recorded paths. Before this change both were un-resolved, so they agreed by accident. Resolving one without the other makes OT's own entries look target-owned, drops them from the manifest, and **silently uninjects the repo** — a worse failure than the bug. They are changed together, deliberately.

Dirs resolving to the _same_ real directory (e.g. `.claude/skills -> ../.agents/skills`) are de-duplicated. Previously the second pass hit the defense-in-depth `existsSync` guard and reported OT's own first-pass entry as `"a non-OT entry already occupies this path"`.

### Migrating repos injected by the old code

**No migration step is needed.** The boot lifecycle already heals them: the reaper tears down every ledger (teardown reaches the real files even from an old-format ledger, because `join()` + the symlink lands on them regardless), and the boot reconcile re-injects with resolved paths. Verified by re-breaking a real repo to the pre-fix state and letting one unattended boot clean it.

The heal only takes effect once the running server is restarted onto a build containing the fix — an old build still injects the broken way.

---

## 4b. The exclude block has more than one tenant (added 2026-08-28)

`writeManagedExcludeBlock` is no longer exclusive to skill injection. `workspace-editors` uses it too, to hide `.openthrottle/workspace-editors.json` (OT `5a1ac8d1`).

**Each owner has its own marker-bracketed block, and touches only that one.** Every write replaces its owner's block wholesale, so a shared marker would mean whichever feature ran second silently deleted the other's — and if the victim were skill injection, every injected skill would become visible again and §4a's guarantee would regress with nothing failing.

Reusing it from a new feature:

1. Add the feature to `GIT_EXCLUDE_OWNER` (`foreign-skill-injection/types.ts`). The value is rendered into the marker text, so **changing an existing one orphans the blocks already on disk**.
2. Pass that owner to `writeManagedExcludeBlock` / `removeManagedExcludeBlock`. It is a required argument, deliberately — a default is exactly how a second tenant would inherit the first's block.
3. Cover the interaction, not just your feature. `workspace-editor-config.service.test.ts` runs both features against one repo in **both orders**; a single-order test passes against an implementation that appends rather than strips and misses the clobber entirely.

The rule that decides what belongs in a block at all is shared with `5a1ac8d1`:

> **Anything OpenThrottle writes into a foreign repo for its own bookkeeping must be hidden from git. Anything the user asked for is theirs, and must stay visible.**

Skill injection is entirely the first kind, which is why §4's guarantee is absolute for it. Features that write user-requested files as well (workspace-editors writes MCP config) must exclude only their own half.

---

## 1a. Target-owned means a real skill, not a directory (added 2026-08-29)

§1's target-wins rule is correct, and it was being fed bad input.

`scanTargetOwnedSkillNames` counted **every directory basename** under a target dir as a name the repo owns. `workspace-editors` apply, meanwhile, pre-created an empty `.agents/skills/<slug>/` for each of the ten slugs in `OPENTHROTTLE_REPO_SKILL_PATHS` — `brag-sheet`, `git-commit`, `link-workspace-packages`, `monitor-ci`, `nx-workspace`, `ot-loop`, `ot-generators`, `ot-plans`, `ot-stack`, `workflow-ralph`.

So OT's protection against clobbering the user's skills fired against **OT's own scaffolding**, and dropped precisely OT's most important curated skills. Both orders are reachable — applying editor config and injecting skills are independent user actions — so the outcome depended on which the user happened to do first:

```
editor-config applied first = false → ot-plans injected and present
editor-config applied first = true  → ot-plans dropped; empty dir, no SKILL.md
```

Invisible, too: the directory exists, so nothing looks wrong until an agent cannot find the skill.

**Rule:** a name is target-owned only with evidence of a real skill — a **symlink**, or a **directory carrying a readable `SKILL.md`**. An empty directory is not a skill and never masks one.

Two places enforce it, and both are needed:

1. `scanTargetOwnedSkillNames` keeps the name in the manifest.
2. The occupancy guard in `ensureMaterialized` reclaims (`rmdir`s) a directory with **no children at all** and proceeds. Without this the name is back in the manifest but the stale directory still blocks the write, and the skill is skipped with a warning. That failure is worse than the original, not better: `injectedNames` reports the skill because the `.claude/skills` copy succeeded, while `.agents/skills` holds an empty directory. **Assert the materialized `SKILL.md`, never just the name.**

A directory with any content is left alone and remains an occupant, so target-wins is unchanged for real skills.

Also fixed at the source: apply no longer creates those directories (`enabledSkillPaths` on the manifest already records which skills OT offers, and nothing reads the directories). The detection rule stays regardless — it fixes the class, and an empty directory should never have masked a real skill.

---

## 7. The in-repo personal tier (added 2026-08-29)

§1's personal layer only ever reached **foreign** repos. This section adds the same tier to the **in-repo** `ot-skill-sync` pipeline, so a private skill fans out into every agent CLI of the repo you are standing in — and can be promoted into the committed catalog with one command.

The mechanism costs almost nothing, because the content never enters the worktree. A personal skill lives at `~/.openthrottle/skills/<name>/SKILL.md`; the only artifact inside the repo is a symlink under `.agents/skills/` and each `AGENT_SKILL_DIRS` entry — paths the existing managed `.gitignore` block already ignores (`!.agents/skills/*/` rescues real directories, and git classes a symlink as a file, not a directory). That is uncommittability twice over, but it is a happy accident of two rules meeting, so §7.4 asserts it explicitly rather than trusting it.

### 7.1 One root, one env var, and only one toggle

|          | in-repo tier (`sync.sh`)                                 | foreign injection                      |
| -------- | -------------------------------------------------------- | -------------------------------------- |
| Root     | `~/.openthrottle/skills`                                 | same                                   |
| Override | `OPENTHROTTLE_PERSONAL_SKILLS_DIR`                       | same                                   |
| Opt-in   | **presence** — the root exists and holds ≥ 1 valid skill | `OPENTHROTTLE_PERSONAL_SKILLS_ENABLED` |

**`OPENTHROTTLE_PERSONAL_SKILLS_ENABLED` keeps exactly the meaning it has today: the foreign-injection toggle.** It is not extended to the in-repo tier, and the two are not unified.

The reason is that the two tiers carry different risk. Foreign injection **writes into somebody else's repository**, on a machine-wide service, for repos the person never named — an explicit, default-off toggle is the right price for that. The in-repo tier writes gitignored symlinks into the repo you are already running `sync.sh` inside, from a directory only you can create. Creating `~/.openthrottle/skills/my-thing/SKILL.md` is already an unambiguous, deliberate act; requiring a second env var to make it take effect adds no safety and one more way to be baffled about why your skill did not appear. Presence is the opt-in.

What the two tiers **must** share is the root itself. There is one contract with two implementations, because the in-repo pipeline is shell and a shell script that had to boot Node just to find a directory would be the worse trade:

- **TypeScript** — `resolvePersonalSkillsRoot()` in `personal-skills-config.ts` is the ungated definition; `resolvePersonalSkillsDir()` is now nothing but the `ENABLED`-gated foreign-injection wrapper around it.
- **Bash** — `resolve_personal_skills_root` in `skills/ot-skill-sync/scripts/common.sh`.

The two are **pinned to each other by a test** (`scripts/__tests__/personal-skills-tier.test.ts` § "one personal root, two implementations") covering the default, an explicit override, and an empty override. Change one, change both — the test says so, and fails when you do not. Duplicating the literal `~/.openthrottle/skills` without that pin is exactly how they drift, and a drift here means a person has two "personal" directories and no way to tell which one a given tool read.

**What counts as a skill** is unchanged and shared with `discoverSkillDirs`: a direct child directory containing a readable `SKILL.md`. Anything else under the personal root is skipped with a **warning, never an error** — a personal tier is where half-finished things live, and one broken draft must not stop the other skills from syncing.

### 7.2 Collision with a committed skill is a hard error

Foreign injection locks `ot-curated < personal < target repo`. In-repo, the repo **is** the target, so that ordering has nothing to say: it would resolve to "the repo wins, drop the personal skill silently", which is the worst of the options — your skill vanishes without a word.

The rule for the in-repo tier is therefore neither precedence nor silence:

```
✗ personal skill 'x' collides with committed skills/x
  rename the personal skill, or re-run with --allow-shadow to run your private fork
```

A name owned by `skills/<name>` (or by `skills-lock.json`) is a **hard error** from `sync.sh`, with an explicit `--allow-shadow` escape hatch for the deliberate case of iterating on a private fork of a team skill. This is deliberately louder than the foreign rule, because the failure it prevents is worse: silently running a private variant of a skill your colleagues also invoke, and reporting results as if they came from the shared one. `--allow-shadow` makes personal win over committed for that run, and says so in the output.

### 7.3 Ownership inside `.agents/skills/` — now four cases

Ownership is read straight off the on-disk type. For links the discriminator is **which root the link resolves into**; for real directories it is **whether `skills-lock.json` claims the slug**:

| On-disk                                            | Owner                      | Sync behaviour                                 |
| -------------------------------------------------- | -------------------------- | ---------------------------------------------- |
| real directory, slug **in** `skills-lock.json`     | vendored install           | never touched                                  |
| real directory, slug **not in** `skills-lock.json` | **repo-authored (custom)** | never touched                                  |
| symlink → `$REPO_ROOT/skills/<name>`               | committed authored         | maintained                                     |
| symlink → `<personal root>/<name>`                 | **personal tier**          | maintained; reported as `personal`             |
| symlink → anywhere else, or dangling               | stale / rogue              | reaped in sync, reported as drift in `--check` |

**The first two rows are one behaviour, not two.** Sync never touches a real directory, before or after this split — the only thing that changed is what it is called. Splitting the row is a vocabulary fix, not a behaviour change, and `--check` must not begin reporting a repo-authored directory as drift.

The last row is the subtle one, because a link into a personal root that is no longer the _current_ root still resolves fine. **Membership in the currently-resolved personal root is the test, not mere resolvability.** A person who repoints `OPENTHROTTLE_PERSONAL_SKILLS_DIR` gets their old links reaped, which is right — they now point at content the pipeline no longer considers part of the tier.

Sync output states the tier each link came from, so `sync.sh` is self-explaining and nobody has to run `readlink` to find out why a skill is there.

#### The custom tier: lockfile absence is the whole discriminator

A real directory under `.agents/skills/` is a vendored install **only if the lockfile claims its slug**. One whose slug is absent was authored by whoever owns this repository, and §1a's resolver has always read it that way: `scanTargetOwnedSkillNames` drops any name the target repo owns, so an injected skill never shadows one the target wrote. What is new here is only that the developer app now has a word for it — **Custom** — instead of reporting it as `external`, i.e. as somebody else's third-party dependency, with an origin-URL lookup that can never hit.

This costs nothing structurally. **No new directory, no new frontmatter key, and no side-ledger** — §7.6 holds unchanged: ownership stays answerable from the filesystem alone, by reading a directory type and one lockfile that already exists. It also makes the tier committable for free: the managed `.gitignore` block ignores everything under `.agents/skills` but re-includes nested directories, and git classes the generated symlinks as files — so a real directory survives into the commit while the links stay ignored.

The developer app applies the **same membership test**. `/skills/:slug` reads and writes a personal SKILL.md through the in-repo symlink — one allowlist of "monorepo root ∪ `resolvePersonalSkillsRoot()`", never a second directory to keep in step, and never by unlinking the link. A custom skill is writable too, in place: it is a real file inside the checkout, and there is no upstream to fork it from. Only a lockfile-installed external skill stays read-only. See `applications/openthrottle-developer/docs/repo-skills-discovery-design.md`.

### 7.4 Uncommittability is asserted, not assumed

`--check` runs `git check-ignore -q` on every generated personal link and reports a violation if it is not ignored. **Assert with `git check-ignore`, never `lstatSync`/`test -e`** — those follow parent symlinks and pass vacuously, a trap already hit once in this codebase.

A staging guard on the existing Husky pre-commit chain refuses a commit that stages any path resolving to a personal skill link, naming the file and pointing at `promote`.

### 7.5 CI parity is the hard constraint

CI has no `~/.openthrottle/skills` and must never gain one. **With the root absent, every code path is byte-identical to today** — same output, same exit code, no new warnings. Personal skills never appear in `skills-lock.json` or the `docs/Skills.md` source table, and that is asserted rather than left to chance.

### 7.6 What the later work must not break

- The stage-1/stage-2 shape. Personal skills enter at stage 1 and ride the existing stage 2 unchanged — **no special-casing downstream**, or the fan-out and the reaper drift apart.
- The ownership-by-type read. Nothing may need a side-ledger; the personal case is still answerable from the filesystem alone (§7.3).
- Directory pruning uses `rmdir` (empty-only) semantics. The recursive-remove variant throws on a directory and silently leaves it behind — that exact bug was hit in the injection teardown path.
- The injection resolver drops any name the target repo owns, and `scanTargetOwnedSkillNames` builds its keys from resolved target dirs. Changing one side without the other silently un-injects OT's own skills (§1a).
- Empty/missing personal root stays a clean no-op on **every** path, including `cleanup.sh` and `--check`.
