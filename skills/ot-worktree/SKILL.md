---
description: Create, heal and destroy git worktrees in any repo — the portable worktree machinery behind `worktree:new`, `worktree:heal` and `worktree:remove`. Use when creating a worktree, provisioning or self-healing a worktree, removing/deleting/tearing down a worktree, or when OPENTHROTTLE_WORKTREE_ROOT, `.worktree/provision.sh` or `.worktree/teardown.sh` are involved.
metadata:
  author: openthrottle
  version: '1.0.0'
name: ot-worktree
---

# ot-worktree

Git worktrees are how you run several branches of one repo side by side. Creating one is
`git worktree add`; making it _usable_ — dependencies, `.env`, ports, containers — is repo-specific
work git has no hook for. This skill owns the generic half and delegates the repo-specific half.

Because openthrottle skills are synced into any repo (`skills/` → `.agents/skills/` → `.claude/skills/`
via [`ot-skill-sync`](../ot-skill-sync/SKILL.md)), every repo that has this skill creates, heals and
destroys worktrees the same way.

## Three composable actions

Each verb is usable standalone and callable from the others.

| Action      | Script               | Entrypoints                                                      | Job                                                   |
| ----------- | -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| **create**  | `scripts/create.sh`  | `pnpm worktree:new <name>`, Claude `WorktreeCreate` hook, Cursor | Create the worktree, then provision it                |
| **heal**    | `scripts/heal.sh`    | `pnpm worktree:heal`, nx `monorepo:ensure-worktree`              | Lazily provision a worktree created outside the skill |
| **destroy** | `scripts/destroy.sh` | `pnpm worktree:remove [name\|path]`                              | Run teardown, remove the worktree, prune admin dirs   |

Shared internals: `scripts/common.sh` (logging, linked-worktree detection, name sanitization, target
validation), `scripts/root.sh` (the root ladder), `scripts/provision.sh` (repo-hook delegation).

## create — three invocation modes, auto-detected

1. **CLI** — name as `$1` (`pnpm worktree:new <name>`). Never reads stdin.
2. **Hook payload** — no name arg and stdin is a pipe: the Claude Code `WorktreeCreate` JSON payload.
   The name comes from `.name // .worktree_name // .worktreeName // .worktree // .branch // .slug`,
   falling back to `wt-<first 8 of session_id>`. The raw payload is logged to `$TMPDIR`.
3. **Provision in place** — no name, no payload, run from _inside_ a linked worktree (Cursor creates
   the worktree itself, then runs a setup command with `cwd=$WORKTREE_PATH`). Provisions the current
   worktree; creates nothing.

Branch name is `${OPENTHROTTLE_WORKTREE_BRANCH_PREFIX:-openthrottle/}<name>`; an existing branch is checked out
rather than failing.

### What the new branch forks from

A worktree you make to test something should not quietly inherit whatever you were mid-way through
on your primary checkout. So the base is resolved on its own ladder, highest rung first:

1. `--base <ref>` or `OPENTHROTTLE_WORKTREE_BASE` — explicit. `--base HEAD` opts back into forking
   from the primary checkout's current branch, which is what you want when stacking on your own work.
   A ref that does not resolve is a hard failure, never a silent fallback.
2. **The remote's default branch** — `refs/remotes/<remote>/HEAD` (remote from
   `OPENTHROTTLE_WORKTREE_REMOTE`, default `origin`, matching the org segment in `root.sh`). Clones
   made before the remote had commits have no such symref, so `<remote>/main` then `<remote>/master`
   are tried as a purely local fallback.
3. `HEAD` — no remote, or no nameable default. The old behaviour, now only a last resort.

**No fetch happens.** Rung 2 is your last-fetched ref, so create stays fast, works offline, and can
never fail on a network hiccup — the Claude `WorktreeCreate` hook blocks on this script. `git pull`
inside the worktree if you need newer than your last fetch.

The branch is created with `--no-track`: cut from `origin/main`, it would otherwise take `main` as
its upstream and aim a later `git push` at the wrong branch. `--base` is ignored, with a warning,
when the branch already exists or when provisioning in place — in both cases there is nothing to fork.

**Stdout contract:** `create.sh` prints _only_ the worktree's absolute path. Everything else is stderr.
Claude's `WorktreeCreate` hook depends on this — any extra stdout line breaks worktree creation.

## Where worktrees live

Two parts: a **root** holding every repo's worktrees, and the `<org>/<repo>` OpenThrottle always
organizes beneath it.

```
~/.openthrottle/worktrees/acme/monorepo/feature-x
└──────── root ─────────┘└─ org/repo ─┘└─ worktree ─┘
```

The root, highest rung wins:

1. `OPENTHROTTLE_WORKTREE_ROOT` in the environment.
2. `OPENTHROTTLE_WORKTREE_ROOT` in the target repo's `.env` — how a repo customizes where **its**
   worktrees go. The same variable, read from the repo instead of the shell.
3. **Default: `~/.openthrottle/worktrees`**, documented in `.env.default`.

One variable, two places it can come from, one default. There is deliberately no settings file and
no third channel: a second source of truth for the same answer is what lets a CLI and a server
disagree about where they put things.

**The root is a root, not a final destination.** OT appends `<org>/<repo>` whatever supplied it —
configured or default — the same shape `OPENTHROTTLE_CHECKOUT_ROOT` uses for clones. Organizing
unconditionally is what keeps the layout predictable; a root used verbatim would pile every repo's
worktrees into one directory.

The org comes from the repo's **git remote**, not its directory name, so two checkouts of different
orgs' `monorepo` cannot collide. By the time this runs git is unambiguously present — every action
here shells out to it. A repo with no remote falls back to just `<repo>`, its directory name. Remote
segments are sanitized to `[A-Za-z0-9._-]`, and `.`/`..` are refused, so a malformed remote cannot
walk out of the root.

A leading `~`/`~/` is expanded, trailing slashes stripped, and a non-absolute root is **rejected**
rather than guessed at.

Worktrees created before this changed stay where they are — they are registered in
`git worktree list`, so every action here still finds them by path.

## The repo hook contract

The skill never knows how to set your repo up. It looks for a provisioner, and runs it if found:

1. `$OPENTHROTTLE_WORKTREE_PROVISION` (absolute, or relative to the worktree)
2. `<worktree>/.worktree/provision.sh`
3. `<worktree>/scripts/setup_worktree.sh`

Teardown mirrors it: `$OPENTHROTTLE_WORKTREE_TEARDOWN`, then `<worktree>/.worktree/teardown.sh` (no `scripts/`
fallback). Nothing found → log and no-op; a plain `git worktree add`/`remove` is a perfectly valid
outcome in a repo with no setup needs.

Hooks run with cwd = the worktree, stdin closed, stdout redirected to stderr, and
`OPENTHROTTLE_SOURCE_REPO` / `OPENTHROTTLE_WORKTREE_NAME` / `OPENTHROTTLE_WORKTREE_PATH` exported. **A non-zero exit is a failure**:
provisioning aborts creation, teardown aborts removal (that is where a repo stops a container or
releases a port lease — removing anyway would leak it).

Full details, including the provisioned-marker scheme heal reads: [references/contract.md](references/contract.md).

## destroy — safety defaults

Destroying a worktree is the one action here that can eat real work, so the defaults are conservative:

- **Refuses the primary checkout.** The target must be a registered _linked_ worktree of this repo.
- **Refuses a dirty tree** — prints what is dirty and requires an explicit `--force`.
- **Branch-preserving.** `--delete-branch` deletes it only if merged; `--delete-branch --force` otherwise.
- **`--dry-run`** prints exactly what would happen and removes nothing.
- Runs the teardown hook _before_ removal, then `git worktree prune`.

With no argument, run from inside a linked worktree, it removes itself (chdir'ing to the primary
checkout first).

## Adopting this in another repo

1. Sync the skills (`./skills/ot-skill-sync/scripts/sync.sh`, or `/ot-skill-sync`).
2. Optionally add `.worktree/provision.sh` (and `.worktree/teardown.sh`) — anything the repo needs to
   make a fresh checkout usable. Skip it entirely if `git worktree add` is already enough.
3. Optionally add the human entrypoints to `package.json`. Copy these verbatim — they resolve the
   skill wherever it lives, so there is nothing to adjust per repo:
   ```json
   "worktree:new": "sh -c 'd=skills/ot-worktree/scripts; [ -x \"$d/create.sh\" ] || d=.agents/skills/ot-worktree/scripts; exec \"$d/create.sh\" \"$@\"' --",
   "worktree:heal": "sh -c 'd=skills/ot-worktree/scripts; [ -x \"$d/heal.sh\" ] || d=.agents/skills/ot-worktree/scripts; exec \"$d/heal.sh\" \"$@\"' --",
   "worktree:remove": "sh -c 'd=skills/ot-worktree/scripts; [ -x \"$d/destroy.sh\" ] || d=.agents/skills/ot-worktree/scripts; exec \"$d/destroy.sh\" \"$@\"' --"
   ```
   **Why a ladder and not a path.** The skill lives at `skills/` in the repo that _authors_ it
   (OpenThrottle) and at `.agents/skills/` in a repo that _installed_ it with `npx skills`. Neither
   path is right everywhere, and in OpenThrottle `.agents/skills/*` is gitignored — the authored
   entries there are symlinks that a fresh clone does not have — so the installed-repo path is not a
   safe universal default. The ladder prefers the authoring path, falls back to the installed one, and
   `exec`s, so no extra process sits between the caller and the script's stdout. That matters: the
   `WorktreeCreate` hook reads `create.sh`'s stdout as the worktree path.
4. Optionally wire the Claude `WorktreeCreate` hook in `.claude/settings.json` and Cursor's
   `.cursor/worktrees.json` provision-in-place command at the same scripts, using the same ladder.

OpenThrottle itself needs no `.worktree/provision.sh`: its existing `scripts/setup_worktree.sh` is
discovered by rung 3. It _does_ ship `.worktree/teardown.sh` (teardown has no `scripts/` rung), which
stops the worktree's own docker compose project before removal.

Note the hook is read from the **worktree's** checkout, not the primary one — so a worktree on a
branch predating the hook will not run it.
