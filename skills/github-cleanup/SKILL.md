---
name: github-cleanup
description: 'Find local branches whose work already reached the default branch (including squash merges), confirm with the user, then delete them and their worktrees. USE WHEN the user runs /github-cleanup, or asks to clean up, prune or delete merged/stale local branches or worktrees. Not for remote branches or for rewriting history (see github-squash).'
disable-model-invocation: false
---

# github-cleanup

Deleting a local branch is cheap to do and expensive to get wrong: a squash-merged branch looks
_unmerged_ to git (`git branch --merged` misses it), and a branch with one unpushed commit looks
just like it. This skill shows the user evidence for every branch, gets **one** yes, and acts on
exactly what was approved.

The flow is **Report → Confirm → Act → Housekeeping**. Never skip Confirm.

## 1. Report

Run the bundled classifier from this skill's directory (it fetches with `--prune` first; it is
otherwise read-only):

```bash
bash <skill-dir>/scripts/classify-branches.sh            # TSV: VERDICT BRANCH PR REASON WORKTREE DIRTY
bash <skill-dir>/scripts/classify-branches.sh --explain <branch>   # files that never reached the default branch
```

The classifier finds the remote and default branch itself through the bundled
`scripts/resolve-repo-context.sh` (`origin`, else the first remote; the remote's own default
branch, whatever it is named), so it works the same in any repo. Run the resolver yourself once
too — its `WORKTREE_REMOVE` line decides step 3.1:

```bash
bash <skill-dir>/scripts/resolve-repo-context.sh
```

It needs `git`, `jq` and an authenticated `gh`. If `gh` is unavailable, stop and say so — PR
state is what separates "open PR" from "merged", and guessing it is how work gets lost.

| Verdict    | Meaning                                                                                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SAFE**   | Tip is on the default branch, or contained in a merged PR's head, or every file the branch changed reached the default branch with exactly that content (how a squash shows up). Backup / pre-squash snapshot branches of merged work land here too. |
| **REVIEW** | Some but not all of the branch's file contents reached the default branch — usually a squash that picked up fixups, sometimes real leftover work.                                                                                                    |
| **KEEP**   | Open PR, checked out in the current worktree, shares no history with the default branch (a branch from another remote), or work found nowhere else. Never offer these for deletion.                                                                  |

**Resolve every REVIEW row before you report.** Run `--explain <branch>` and, for each listed
file, `git diff <remote>/<default> <branch> -- <file>`. A file is explained when the default branch
holds the same change plus later edits (lint, rename, review fixes). If every file is explained,
move the branch to SAFE and say why in one line; otherwise leave it REVIEW and show the user the
unexplained hunks — that decision is theirs.

**Inspect every SAFE row that has a worktree.** Run `git -C <worktree> status --short` and
read it. Untracked generated output (`node_modules/`, build dirs, `__generated__/`, `.env`
copies, caches) is not work. Tracked modifications might be — look at them. A worktree that holds
real uncommitted work demotes its branch to KEEP. If another agent session may be running in that
worktree, ask before touching it.

## 2. Confirm

Present the result as three groups — **Safe to delete**, **Needs your call** (REVIEW), **Keeping**
— with the PR number and a short reason per branch. Under Safe, mark each branch that has a worktree,
and whether removing that worktree needs `--force` (it is dirty), naming what the dirt is.

Then ask **one** question: delete the Safe group (optionally plus named REVIEW branches)? The
approval covers exactly the listed branches and worktrees — nothing found later. A forced worktree
removal must be named in the question; a plain "yes" does not cover a `--force` you did not list.

## 3. Act

1. **Worktrees first** — git refuses to delete a branch that a worktree has checked out. Use the
   resolver's `WORKTREE_REMOVE`:
   - `pnpm worktree:remove` — the repo defines that script (the ot-worktree skill), so use it and
     its teardown hooks run: `pnpm worktree:remove <worktree-dir-name>`.
   - `git worktree remove` — the repo has no such script: `git worktree remove <path>`, then one
     `git worktree prune` after the last removal.

   Add `--force` only where the user approved it. If a removal is refused or blocked, skip that
   branch, carry on with the rest, and report it with the command for the user to run.

2. **Branches** — one `git branch -D <b1> <b2> …` (`-D`, because squash-merged branches fail
   `-d`). Keep the printed `(was <sha>)` lines: they are the undo
   (`git branch <name> <sha>`) until the objects are pruned.
3. Re-run the classifier with `--no-fetch` and confirm none of the deleted branches remain.

## 4. Housekeeping (offer, separate yes)

Offer these after the deletions, as their own question:

| Step                            | Why                                                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git worktree prune`            | Drops admin entries for worktree folders deleted by hand.                                                                                                                                           |
| `git remote prune <remote>`     | Already done — the classifier's `fetch --prune` removes stale remote-tracking refs.                                                                                                                 |
| `git maintenance run --task=gc` | Repacks and expires loose objects on git's safe defaults (unreachable objects older than two weeks). Better still: `git maintenance start` once, and git does this in the background on a schedule. |
| `git stash list`                | Report only — old stashes are work the user forgot about, not garbage. Never drop one unasked.                                                                                                      |

**Do not run `git gc --aggressive --prune=now` by default.** `--prune=now` deletes unreachable
objects immediately, which throws away the undo SHAs from step 3, and it races any git command
running at the same time in a sibling worktree (they share one object store), which can corrupt
that command's work. `--aggressive` recomputes every delta from scratch: minutes of CPU for a small
size win, worth doing rarely, not as routine. Run either only when the user asks for it by name,
and only after confirming no other session or worktree is mid-operation.

Out of scope, and why: remote branches (deleting them is outward-facing — recommend the repo's
"Automatically delete head branches" setting instead), `git clean` (deletes untracked files with no
undo), and anything that pushes.
