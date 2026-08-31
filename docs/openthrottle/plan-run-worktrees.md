# Plan-run worktrees (BullMQ / programmatic runs)

Every programmatic plan run on the plans queue — the GraphQL `enqueuePlanRalph` mutation,
tag-action rules, the Ralph CLI handoff — executes inside a git worktree that **OpenThrottle
creates itself**, with verbose agent logging, and with the run's workspace bound to that
worktree.

Out of scope: interactive chat runs (`react-router-chat`), which keep their existing
working-directory behavior, and **scheduled agent jobs**, which have their own processor and
cwd ladder (`resolveScheduledAgentJobRunCwd`) rather than a plan-run job payload.

## Defaults, and how to opt out

A plan run enqueued with no explicit configuration runs **cursor + worktree + verbose**. The values
live in `@openthrottle/openthrottle-plan-config` and are injected server-side at enqueue
(`applyPlanRunProgrammaticDefaults`), so every programmatic path inherits them — the GraphQL
mutation, tag-action rules, and the Ralph CLI handoff alike. The developer UI only reflects the same
constants; it is not a second source of truth.

Opting out is per plan, on the Configuration tab:

- **Worktree → Off** persists `ralph.worktreeCli: 'omit'` and enqueues `disableWorktree: true`, so
  the run works directly in the base checkout.
- **Logging → omit** persists `ralph.debugCli: 'omit'`, which travels explicitly in the enqueue
  payload precisely so the server default cannot override it.

**Existing plans.** An absent key resolves to the _current_ default; a persisted value — including
`'omit'` — is a choice and is kept. Because the old defaults wrote `'omit'` into every new plan,
migration `098` re-points only those plans whose entire `ralph` block still equals the old default
block (demonstrably never configured) and leaves every customized plan alone. It is idempotent: a
re-run matches zero rows.

**Disk.** Worktree-by-default means one worktree per plan that has ever run programmatically, each
with its own `node_modules` — on the order of 1–2 GB apiece. Nothing is removed automatically (see
the cleanup decision below); prune with `git worktree remove` when a plan's work has landed.

## Why the server creates the worktree

The agent CLIs accept a `-w` / `--worktree` flag that makes the CLI create its own
worktree. Queued runs do **not** use it. When the CLI owns the worktree, the orchestrator
never learns the resulting path: `getWorkflowConfigCwd()` still resolves to the parent
checkout, `RepositoryInspectionService.scan()` reports `isLinkedWorktree: false`,
checkout registration is skipped, and `plan_runs.checkout_id` stays `NULL`.

So the server provisions the worktree up front through the one sanctioned entrypoint,
`pnpm run worktree:new <name>` (`skills/ot-worktree/scripts/create.sh`), and uses the absolute path
it prints on stdout as the run's working directory. Exactly one worktree per run, and the
path is known before the agent starts — which is what checkout registration, `.env`
provisioning, and per-path agent-CLI MCP approval all require.

A bare `git worktree add` is never used: it skips port allocation and `.env` provisioning,
and only self-heals on the first `:dev`.

## Decisions

| Decision           | Choice                                                                                              | Rationale                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Naming**         | `plan-<first 8 chars of the plan UUID>` — e.g. `plan-5e172b67`, branch `openthrottle/plan-5e172b67` | Deterministic (survives a plan retitle), collision-free within a repo, already inside the `[A-Za-z0-9._-]` set the `ot-worktree` skill sanitizes to, and short enough to read in `git branch` and a PR title.                                                                                                                                                            |
| **Lifecycle**      | One worktree per **plan**, reused across runs                                                       | Ralph runs are iterations of the same work landing as one branch and one PR; reuse preserves that branch history and keeps disk flat. Per-run worktrees would multiply ~2 GB `node_modules` trees per iteration.                                                                                                                                                         |
| **Cleanup**        | No automatic removal. Removal is explicit: `pnpm worktree:remove <name>`                            | A worktree may hold uncommitted or unpushed work — the only safe automatic removal requires a clean tree, no unpushed commits, no active run, and an age floor. The destroy action gives removal a safe front door (see "Removing a worktree"); an automatic sweep on top of it is still a follow-up. Ceiling: one worktree per plan that has ever run programmatically. |
| **Failure policy** | Fail the run fast                                                                                   | A fallback to the process cwd silently drops the agent into the primary checkout — the exact bug this design fixes. The provisioner's stderr goes to the plan output stream so the failure is legible.                                                                                                                                                                   |
| **Timing**         | At job start, in the orchestrator — not at enqueue                                                  | A run queued for hours should not hold a worktree. It also keeps `validateWorkingDirectory`'s existence check honest: the enqueue payload carries a worktree _name_, and only an explicit caller-supplied `workingDirectory` is existence-checked.                                                                                                                       |
| **Concurrency**    | Idempotent provisioning + per-path serialization                                                    | The provisioner reuses an existing linked worktree at the target path instead of recreating it, and serializes concurrent provisioning of the same path in-process. The plans worker is `concurrency: 1`, so this only guards re-runs after a stall and multi-instance deployments.                                                                                      |

## Worktree root

Every agent — Claude, Cursor, Ralph, the BullMQ plans worker — creates worktrees under one
root. There is **one** implementation of that ladder,
`applications/openthrottle-server/src/services/worktree-root/worktree-root.resolver.ts`,
mirroring `resolve_worktree_root` in `skills/ot-worktree/scripts/root.sh`. Both the provisioning
path and the discovery path (below) consume it, so the settings page, the worker, and the
`/settings/repositories` table can never disagree about where worktrees live. The resolver
returns the resolved root **and** which rung answered it, as a `source`:

| `source`       | Rung                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `env`          | `OPENTHROTTLE_WORKTREE_ROOT` in the process environment.                                         |
| `checkout-env` | `OPENTHROTTLE_WORKTREE_ROOT` in the target repo's `.env` — a repo customizing its own worktrees. |
| `default`      | `~/.openthrottle/worktrees` — the hidden root OT owns.                                           |

### Where worktrees live

Worktrees land at `<root>/<org>/<repo>/<worktree>`. The default root is
`~/.openthrottle/worktrees`, a hidden directory OpenThrottle owns; it sits outside every repo so
worktrees stay clear of the Nx workspace (daemon watches, Vitest/knip/gitleaks globs, `.gitignore`).

The `<org>/<repo>` beneath it comes from the checkout's **git remote**, not its directory name — two
checkouts of different orgs' `monorepo` would otherwise share one path. A repo with no remote falls
back to its directory name.

An override — `OPENTHROTTLE_WORKTREE_ROOT` in the environment or in the target repo's `.env` —
replaces the **root**. OT still appends `<org>/<repo>` beneath it, so a configured root behaves
exactly like the default one: the root is a root, not a final destination, the same shape
`OPENTHROTTLE_CHECKOUT_ROOT` uses for clones.

### One variable, no second channel

`OPENTHROTTLE_WORKTREE_ROOT` is the only way to change where worktrees land. It is read from the process
environment, or from the target repository's `.env` when that repo wants its own location, and
otherwise falls back to a default OpenThrottle ships in code and documents (commented) in
`.env.default`.

Nothing forwards a root to the script: the provisioner passes its own environment through and lets
`resolve_worktree_root` answer, so the server and the CLI cannot disagree.

## Removing a worktree

`pnpm worktree:remove <name|path>` (the `ot-worktree` destroy action) runs the repo's
teardown hook, removes the worktree, and prunes the stale admin dir under `.git/worktrees/`.
Because this is the one action that can destroy real work, the defaults are conservative:

- **Refuses the primary checkout.** The target must be a linked worktree git lists under this
  repo's common dir.
- **Refuses a dirty worktree**, printing the uncommitted paths, unless you pass `--force`.
- **Branch-preserving.** The branch survives unless you pass `--delete-branch`, which deletes
  it only if merged; `--delete-branch --force` for the unmerged case.
- **`--dry-run`** prints exactly what would happen and removes nothing.
- A teardown hook that exits non-zero **aborts** the removal, so a repo can stop a container
  or release a port lease without the directory disappearing underneath it.

Run with no argument from inside a linked worktree, it removes itself.

The shell script and this resolver have the same three rungs, in the same order. Nothing is
forwarded from the server: the provisioner passes its own environment through and lets
`resolve_worktree_root` answer, so the script stays the one entrypoint that creates anything and the
two implementations cannot drift apart. A test pins the default against `root.sh` and `.env.default`.

The default deliberately sits **outside** the repository. An in-repo root would put every
worktree's file tree inside the Nx workspace — watched by the Nx daemon, walked by
Vitest/knip/gitleaks globs, and needing a `.gitignore` entry that is easy to get wrong —
and each worktree carries its own `node_modules`.

Changing the root affects **new** worktrees only: `git worktree` stores absolute paths in
`.git/worktrees/<name>/gitdir`, so existing worktrees stay where they are.

See [worktree-port-allocation.md](../monorepo/worktree-port-allocation.md) for the port
block each worktree gets.

## Worktrees on /settings/repositories

`/settings/repositories` lists the worktrees that exist **on disk** for the user's
repositories, whether or not OpenThrottle created them — a worktree made by hand with
`pnpm run worktree:new`, by a Claude or Cursor session, or by ot-loop shows up
alongside the server-provisioned ones. Before this, a child row existed only where a
`repository_checkouts` row did, so the worktree the user was actually working in was
routinely invisible.

Discovery unions two sources and dedupes them on the symlink-resolved real path:

1. **`git worktree list --porcelain`, run live** in each registered primary checkout —
   authoritative for a repository, and it sees worktrees under any root. The cached
   `inspection.git.linkedWorktrees` snapshot is deliberately **not** used: it is keyed on
   `scannedAt` and goes stale.
2. **A depth-1 scan of the resolved root**, keeping children whose `.git` is a _file_
   pointer. This is what catches a worktree whose base checkout is not registered, or whose
   primary lives outside the configured workspace roots. `git rev-parse --git-common-dir`
   walks back to the owning repository so the row still lands under the right parent.

Discovery is read-only with respect to git, bounded (depth-1 only, every probe carries a
timeout and `maxBuffer`, the result is capped with the overflow counted and reported), and
non-fatal — every filesystem or git failure becomes a warning on the payload rather than an
error on the page. It reads only the resolved root; no client-supplied path reaches it.

### Activity: what does and does not count as running

Each worktree carries exactly one activity state. **A directory existing never means a
worktree is running.**

| State     | Meaning                                                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RUNNING` | A **live** `IN_PROGRESS` `plan_runs` row points at this worktree's registered checkout. Live means `COALESCE(last_heartbeat_at, created_at)` is inside `STALE_CUTOFF_MS` — the same liveness expression the stale sweeper uses from the other side. |
| `DIRTY`   | No live run, but `git status --porcelain` is non-empty or the branch is ahead of its upstream.                                                                                                                                                      |
| `IDLE`    | Clean, with nothing running.                                                                                                                                                                                                                        |

A **stale** `IN_PROGRESS` run is a dead run: it reads as `DIRTY` or `IDLE`, never as
`RUNNING`. A row the last scan did not observe carries no activity at all and gets no badge,
rather than a misleading "Idle" that would assert a cleanliness nobody checked.

`unregistered` is carried separately and is orthogonal: an unregistered worktree can be
`DIRTY`. Only a registered worktree can be `RUNNING`, because `plan_runs.checkout_id` is how
a run records where it executes — and the provisioning path always registers what it creates.
An unregistered worktree gets a one-click **Register this worktree** row action, which posts
the same `addFolder` intent the add-folder dialog posts.

### Deliberately out of scope

The page **never** creates, prunes, or deletes a worktree. No "new worktree" button, no
`git worktree prune`, no directory removal — a worktree may hold uncommitted or unpushed
work, so destructive removal needs its own design (see the Cleanup row in Decisions above).
Registering a discovered worktree is the only write this surface performs, and it only adds
a database row.

## Run-start preflight

Because worktree-by-default multiplies how often a run starts in a path the agent CLI has
never seen, the orchestrator preflights the resolved directory before the first agent turn
and writes anything it finds into the plan output stream (warn-only — the run continues,
but a false success is no longer silent):

- **`.env` present and non-empty.** A worktree created outside `worktree:new` has none, and
  the symptom is an interactive **credential prompt**, not an error.
- **The backend's workspace MCP config exists** — `.cursor/mcp.json` for cursor,
  `.mcp.json` for claude — and defines `openthrottle-mcp`. Without it the agent cannot read
  or update the plan it was given.
- **Relative launchers resolve from the run directory.** An entry like
  `bash ./scripts/run-openthrottle-mcp.sh` is _discovered_ by the CLI walking up to the
  workspace root but _spawned_ with the process cwd, so it reports a connection failure from
  anywhere else.

`pnpm run worktree:new` satisfies all three: it provisions `.env`, both MCP config files,
and the `scripts/` launchers in the new worktree.

## Known traps

- A fresh worktree path needs its own agent-CLI MCP approval. For cursor that is the
  `--approve-mcps --trust` pair the driver emits from its `mcpAutoApprove` capability;
  approval is otherwise cached per workspace path, which is why this only ever fails in a
  path nobody has used interactively.
- A run whose tool catalog is missing OT tools while other servers attach is an
  approval/cwd problem, not an auth problem — check the catalog split before chasing
  credentials.
