# Foreign-workspace skill injection — decision record

**Status:** accepted (visormatt, 2026-08-13). Supersedes the 2026-08-12 run-scoped-ephemeral direction. **§2's CLI matrix re-verified and corrected 2026-08-26** (Antigravity added; claude/codex/opencode/grok coverage restated) — the decisions are unchanged, the coverage facts were wrong.
**Plan:** OT `d3a30314-5f91-4213-9ef1-25d21d2f8680`.
**Related:** [agent-editor-folders.md](./agent-editor-folders.md), `skills/ot-skill-sync/scripts/` (the in-repo SSOT fan-out this extends — its fan-out default became `.claude/skills .gemini/skills` on 2026-08-26), `packages/openthrottle-drivers/src/drivers/` (the supported CLI set §2 is measured against).
**Sibling — read alongside:** [child-repo-hook-overlay.md](./child-repo-hook-overlay.md) solves the same problem for **hooks**, and reaches the OPPOSITE conclusion for a concrete reason: §2 below establishes that no CLI exposes an out-of-repo skills directory **as a flag or env override** — the two config-file pointers that do exist (`agy`'s `.agents/skills.json`, opencode's `opencode.json`) live in tracked files inside the target repo, so they fail the non-mutation guarantee rather than supplying an out-of-repo hook-style escape. That is what forces materialization here. Every CLI we support _does_ expose out-of-repo hook config, so hooks are never written into a target repo. Do not generalize this record's approach to hooks.

## Problem

OpenThrottle's real downstream value is its curated skill set (`ot-plans`, `nx-workspace`, the `openthrottle-*` skills, …). When OT drives an agent CLI in a **foreign workspace** — any checkout outside the OT monorepo, e.g. a consumer's `ssm-data-pipeline` — those skills are absent. The only foreign-workspace handling today is a _prompt layer_ (`buildForeignWorkspacePromptLayer`, `packages/openthrottle-agentic-utils/src/utils/foreign-workspace-context.ts`) that does the **opposite** of what we now want: it tells the agent to NOT reference OT `/skills`, generators, or tooling.

## Goal

Make OT's curated skills a **layered, non-mutating, server-scoped** base that is projected INTO the foreign repo while the OT server runs, reused across runs, and reconciled on shutdown/boot — extending the existing ot-skill-sync SSOT/fan-out (`skills/<name>` → `.agents/skills/<name>` → per-agent dirs) to a third, **external** target. Non-goal: changing how the in-repo ot-skill-sync fan-out works. This adds an external consumer of the same SSOT.

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

> **Re-verified 2026-08-26** against the installed binaries/bundles, and **corrected**: the original table over-credited `.agents/skills`. The two-dir placement decision stands, but its _coverage_ is narrower than first recorded, and Antigravity — added to the driver set in 2026-08 — turns out to be covered for free. The numbers below are read off each CLI's own path constants and shipped docs; re-verify before changing the target set. The **discovery** facts are shared with ot-skill-sync's in-repo fan-out (`skills/ot-skill-sync/SKILL.md` § "Which CLI reads what") and must stay in sync; the **coverage** facts are per-consumer and deliberately differ — see the two tables below.

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

### Corrections to the 2026-08-13 table

- **claude does NOT read `.agents/skills`.** Verified against 2.1.232: `.claude/skills` is its only in-repo skills dir (`.agents` appears there only in unrelated SDK/plugin symbols). The `.claude/skills` half of the union is therefore load-bearing for Claude Code itself, not merely a Grok/Cursor convenience.
- **codex does NOT read `.agents/skills`** — nor any in-repo dir. 0.145.0 discovers skills only under `$CODEX_HOME/skills` (`~/.codex/skills`); its `.agents/` handling is plugin-marketplace manifests. **No in-repo injection can reach codex**, so codex-driven foreign runs cannot get OT skills by this mechanism at all. (Cursor's scan of `.codex/skills` is Cursor's compat behavior, not codex's own.)
- **opencode does NOT read in-repo `.agents/skills`.** 1.18.16 reads project skills from `.opencode/skill(s)/<name>/SKILL.md`; its "external" auto-scans are **home-scoped only** (`~/.claude/skills`, `~/.agents/skills`, disableable via `OPENCODE_DISABLE_EXTERNAL_SKILLS`).
- **grok DOES read `.agents/skills`** — an upgrade from the original table. Per its own shipped docs it "scans `.agents/skills/` (and `commands/`) at each tier," walking from cwd to repo root, alongside `.grok/`, `.claude/`, and `.cursor/`.
- **cursor** is unchanged: reads `.cursor/skills`, `.claude/skills`, `.codex/skills`, and `.agents/skills`.

### Antigravity (`agy` 1.1.21) — covered for free, no new dir

The Antigravity CLI (added as a driver in 2026-08; see `packages/openthrottle-drivers/src/drivers/antigravity.ts`) discovers workspace skills from **`<workspace>/.agents/skills/<name>/`**, plus a global `~/.gemini/config/skills/<name>/`. The existing `.agents/skills` injection therefore reaches it with **zero changes to the materializer** — the one piece of good news in this re-verification.

Two traps worth recording, both following from Antigravity being a ground-up Go rewrite that merely reuses the `~/.gemini` prefix:

- **`agy` has nothing to do with `.gemini/skills`.** That is the _Gemini CLI's_ project dir. Antigravity's global scope is `~/.gemini/config/skills`, a different layout under the same prefix. Adding `.gemini/skills` for gemini does not serve `agy`, and satisfying `agy` does not serve gemini.
- **`agy` supports an `.agents/skills.json` manifest** whose entries accept absolute and `~`-prefixed `path` values — the only out-of-repo skills _pointer_ found in any supported CLI. It does not rescue the design: the manifest is a **tracked file in the target repo**, so writing it would break the non-mutation guarantee (§4), and its global twin (`~/.gemini/config/skills.json`) is rejected below as a global. Recorded so a future revisit starts from the facts. (opencode's `opencode.json` `skills.paths` accepts absolute paths and draws the same tracked-file objection.)

**Gemini discovery detail (0.25.2, from the shipped source):** gemini reads `.gemini/skills` (project scope — `Storage.getProjectSkillsDir()` returns `<targetDir>/.gemini/skills`) and `~/.gemini/skills` (user scope). The user scope is rejected below with the other globals, so the project dir is the only viable target.

### Rejected: global user dirs (`~/.claude/skills`, `~/.grok/skills`, …)

Considered and rejected. They are (a) **non-uniform** across CLIs (each CLI names its global dir differently and some have none), and (b) **permanently global** — they would leak OT skills into _every_ repo the user touches and _every_ interactive session, overshooting the requirement of "visible while the OT server runs, scoped to the repos OT actually drives." In-repo injection with a lifecycle we own is the only mechanism that is both uniform and bounded.

---

## 3. Lifecycle — server-scoped, per-repo (not run-scoped ephemeral)

Changed from the 2026-08-12 run-scoped design. The reframing: CLIs only discover skills from in-tree dirs (no out-of-repo pointer), and the desired property is "OT skills present and visible **while the server is running**." So the layer's lifetime tracks the **server**, not the run.

- **Materialize (lazy, per-repo):** on the first foreign run that touches a given repo. `ensureMaterialized(repo)` is **idempotent** — a cheap no-op when the layer is already present — so it is safe to call at the start of every run and is **reused across all subsequent runs** at zero per-run setup cost.
  - **Insertion point:** `AgenticRalphOrchestratorService.runPlanOrchestratorJob` (`applications/openthrottle-server/src/queues/agentic-ralph/agentic-ralph-orchestrator.service.ts`), immediately after `getWorkflowConfigCwd(...)` and alongside the existing soft-fail `maybeRegisterWorktreeCheckout({ filesystemPath: configCwd })`. This runs exactly once per server-side run, before `orchestrator.execute`. It is the single foreign-workspace choke point on the server path.
  - The detached-CLI path (`tools/workflows/src/bin/ralph.ts`) runs _inside_ the foreign checkout already; it is out of scope for server-managed injection (the user owns that tree). Server-orchestrated runs are the target.
- **Teardown (server shutdown):** on `OnApplicationShutdown` (already wired via `app.enableShutdownHooks(['SIGTERM','SIGINT'])` in `applications/openthrottle-server/src/main.ts`). Teardown removes exactly and only the ledger-recorded paths and their `.git/info/exclude` entries. Teardown is **NOT** per-run — a run finishing does not remove the layer, because the next run reuses it.
- **Boot reaper (missed teardowns):** see §4. A crash means shutdown teardown never ran, so a startup sweep reconciles stranded ledgers.

Materialize triggers: **run start** (idempotent ensure). Teardown triggers: **server shutdown** (graceful) + **boot reaper** (crash recovery). Not: run terminal states.

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

## 5. Reuse vs. new code

**Reused as-is:**

- `packages/openthrottle-skills` for discovery + frontmatter parsing: `walkAgentAssetFiles` / `parseSkillFrontmatter` / `skillFrontmatterSchema`. No new frontmatter parser.
- `packages/openthrottle-agentic-utils/src/utils/workspace-paths.ts`: `getWorkspacePathMapping` / `toContainerPath` / `toHostPath` to detect container mode and translate paths.
- `getOpenThrottleRoot(env)` (`workflow.ts`) to locate `<OT_ROOT>/skills/` (the curated SSOT) and `resolveForeignWorkspaceContext` to detect foreign runs.
- The stale-sweep lifecycle (`PlanRunsStaleSweepProcessor`, `PlanRunsService.findStaleInProgressRuns` / `settleStaleRun`, `enableShutdownHooks`) as the **host** for the boot reaper and shutdown teardown — we ride it, not build a bespoke marker system.

**Reused as a pattern, re-implemented in TypeScript (not the bash):** ot-skill-sync's _concepts_ — ordered manifest, collision precedence, marker-bracketed managed ignore block, idempotent ensure/cleanup. We do **not** call `skills/ot-skill-sync/scripts/*.sh` because it (a) edits the tracked `.gitignore` (we need `.git/info/exclude`), (b) assumes the SSOT is in the same repo, and (c) has no cross-server teardown/reaper. The materializer is server-side TS.

**New code:**

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

> At no observable point does OT's skill injection modify a tracked file in the target repo or leave `git status` dirty. Injected entries live in `.agents/skills/`/`.claude/skills/` and are hidden via the untracked `.git/info/exclude`; a per-repo ledger records exactly what was created (path + mode + fingerprint) so shutdown teardown and the crash-recovery boot reaper remove precisely those entries and nothing else. Target-owned skill names are excluded from the manifest before materialization, so the repo's own skills are never masked or touched.
