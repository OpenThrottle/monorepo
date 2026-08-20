# Foreign-workspace skill injection — decision record

**Status:** accepted (visormatt, 2026-08-13). Supersedes the 2026-08-12 run-scoped-ephemeral direction.
**Plan:** OT `d3a30314-5f91-4213-9ef1-25d21d2f8680`.
**Related:** [agent-editor-folders.md](./agent-editor-folders.md), `skills/skill-sync/scripts/` (the in-repo SSOT fan-out this extends).

## Problem

OpenThrottle's real downstream value is its curated skill set (`ot-plans`, `nx-workspace`, the `openthrottle-*` skills, …). When OT drives an agent CLI in a **foreign workspace** — any checkout outside the OT monorepo, e.g. a consumer's `ssm-data-pipeline` — those skills are absent. The only foreign-workspace handling today is a _prompt layer_ (`buildForeignWorkspacePromptLayer`, `packages/openthrottle-agentic-utils/src/utils/foreign-workspace-context.ts`) that does the **opposite** of what we now want: it tells the agent to NOT reference OT `/skills`, generators, or tooling.

## Goal

Make OT's curated skills a **layered, non-mutating, server-scoped** base that is projected INTO the foreign repo while the OT server runs, reused across runs, and reconciled on shutdown/boot — extending the existing skill-sync SSOT/fan-out (`skills/<name>` → `.agents/skills/<name>` → per-agent dirs) to a third, **external** target. Non-goal: changing how the in-repo skill-sync fan-out works. This adds an external consumer of the same SSOT.

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

All five agent CLIs discover skills **only from directories inside the working tree**. None exposes an out-of-repo `--skills-dir` flag or env override. So the layer must live inside the foreign repo. The **union of two dirs** covers all five:

| CLI      | reads `.agents/skills` | reads `.claude/skills` |
| -------- | :--------------------: | :--------------------: |
| claude   |           ✅           |           ✅           |
| codex    |           ✅           |           —            |
| opencode |           ✅           |           —            |
| cursor   |           ✅           |           ✅           |
| grok     |           —            |           ✅           |

`.agents/skills` → claude/codex/opencode/cursor; `.claude/skills` → claude/cursor/grok. Injecting into **both** reaches every CLI with no per-CLI branching. This mirrors skill-sync's own two-stage layout (`.agents/skills` as the universal view, `.claude/skills` as an agent fan-out target).

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

### Ledger vs. skill-sync's ownership-by-type

skill-sync needs **no side-ledger**: inside `.agents/skills/` a real directory is external (lockfile-owned) and a symlink is skill-sync's own — ownership is read straight off the on-disk type, and a static `.gitignore` block covers all generated links. That works because skill-sync operates _within one repo_ where it authoritatively owns the symlinks.

Our case is different and **needs an explicit ledger** because:

- The source (`<OT_ROOT>/skills/<name>`) is **outside** the target repo, so our symlinks are absolute/out-of-tree — the very kind skill-sync's own walker _skips_ as "not mine." We cannot rely on the target repo's own tooling to recognize or preserve them.
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

**Reused as a pattern, re-implemented in TypeScript (not the bash):** skill-sync's _concepts_ — ordered manifest, collision precedence, marker-bracketed managed ignore block, idempotent ensure/cleanup. We do **not** call `skills/skill-sync/scripts/*.sh` because it (a) edits the tracked `.gitignore` (we need `.git/info/exclude`), (b) assumes the SSOT is in the same repo, and (c) has no cross-server teardown/reaper. The materializer is server-side TS.

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
