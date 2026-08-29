# The ot-worktree repo hook contract

`ot-worktree` owns the generic mechanics — resolving the root, `git worktree add`/`remove`, name
sanitization, hook-payload parsing, the self-heal guard. It knows nothing about how to make _your_
repo usable. That half is a repo-provided hook, and this file is its contract.

Both hooks are optional. A repo with no setup needs provides neither, and `create`/`destroy` degrade
to a plain `git worktree add`/`git worktree remove` with a log line.

## Discovery

`provision` — first hit wins:

| #   | Location                               | Notes                                           |
| --- | -------------------------------------- | ----------------------------------------------- |
| 1   | `$OPENTHROTTLE_WORKTREE_PROVISION`     | Absolute, or relative to the worktree root      |
| 2   | `<worktree>/.worktree/provision.sh`    | The portable, repo-agnostic location            |
| 3   | `<worktree>/scripts/setup_worktree.sh` | Incumbent path — what OpenThrottle already uses |

`teardown` mirrors it, minus the third rung (there is no incumbent to preserve):

| #   | Location                           |
| --- | ---------------------------------- |
| 1   | `$OPENTHROTTLE_WORKTREE_TEARDOWN`  |
| 2   | `<worktree>/.worktree/teardown.sh` |

A discovered hook must be a **regular, readable file**. If it is not executable it is run via `sh`
rather than treated as an error.

## Execution environment

| Aspect    | Value                                                                              |
| --------- | ---------------------------------------------------------------------------------- |
| cwd       | The worktree                                                                       |
| stdin     | Closed (`</dev/null`) — any prompt takes its default instead of hanging            |
| stdout    | Redirected to stderr, so `create.sh`'s path-only stdout contract is never violated |
| exit code | Non-zero = failure (see below)                                                     |

Exported for both hooks:

| Variable                     | Meaning                                      |
| ---------------------------- | -------------------------------------------- |
| `OPENTHROTTLE_SOURCE_REPO`   | Absolute path to the primary checkout        |
| `OPENTHROTTLE_WORKTREE_NAME` | The worktree's name (its directory basename) |
| `OPENTHROTTLE_WORKTREE_PATH` | Absolute path to the worktree                |

## Failure semantics

- A **provision** hook that exits non-zero fails worktree creation. Better to fail loudly than hand
  back a half-built tree that fails in a confusing way an hour later.
- A **teardown** hook that exits non-zero **aborts the removal** — the worktree is left in place.
  Teardown is where a repo stops a container, releases a port lease, or drops a scratch database;
  removing the directory anyway would leak all of it.

## Skipping provisioning

Set either to `0` to create the worktree without running the provisioner:

- `OPENTHROTTLE_WORKTREE_SETUP=0` — the tool-agnostic name.
- `CLAUDE_WORKTREE_SETUP=0` — the pre-existing name, still honored.

## The provisioned marker (how `heal` decides)

`heal.sh` must know whether a worktree has already been provisioned, without hardcoding any repo's
marker files. The scheme:

1. **Skill-written marker (authoritative).** After a successful provision, `create.sh` and `heal.sh`
   write `<worktree git admin dir>/ot-worktree-provisioned` — i.e. inside `.git/worktrees/<name>/`,
   which is per-worktree, never in the work tree, and disappears with the worktree itself. If it
   exists, `heal` is a no-op.
2. **Repo-declared markers (back-compat).** Otherwise the skill checks
   `OPENTHROTTLE_WORKTREE_PROVISIONED_MARKERS` — a space-separated list of worktree-relative paths, defaulting
   to `.env`. If **all** of them exist, the worktree is treated as already provisioned and the marker
   from (1) is written so subsequent checks take the fast path. This is what keeps worktrees created
   before this skill existed from being needlessly re-provisioned.
3. Otherwise the worktree is unprovisioned: `heal` runs the provisioner once, then writes the marker.

`heal` is a no-op outside a linked worktree, so the primary checkout pays only a couple of
`git rev-parse` calls.

## Environment variables, all together

| Variable                                    | Used by      | Default                                        |
| ------------------------------------------- | ------------ | ---------------------------------------------- |
| `OPENTHROTTLE_WORKTREE_ROOT`                | all          | `~/.openthrottle/worktrees` (+ `<org>/<repo>`) |
| `OPENTHROTTLE_WORKTREE_BRANCH_PREFIX`       | create       | `openthrottle/`                                |
| `OPENTHROTTLE_WORKTREE_BASE`                | create       | the remote's default branch                    |
| `OPENTHROTTLE_WORKTREE_REMOTE`              | create       | `origin`                                       |
| `OPENTHROTTLE_WORKTREE_PROVISION`           | create, heal | (discovery)                                    |
| `OPENTHROTTLE_WORKTREE_TEARDOWN`            | destroy      | (discovery)                                    |
| `OPENTHROTTLE_WORKTREE_PROVISIONED_MARKERS` | create, heal | `.env`                                         |
| `OPENTHROTTLE_WORKTREE_SETUP`               | create, heal | `1`                                            |
| `CLAUDE_WORKTREE_SETUP`                     | create, heal | `1`                                            |
