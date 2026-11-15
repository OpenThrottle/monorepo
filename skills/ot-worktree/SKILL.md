---
compatibility: Requires git, a POSIX sh and bash; curl is optional (OpenThrottle deregistration); jq for hook payloads; Node 22.18+ only to run a repo's `.ts` provision hook. Hook contract in references/contract.md.
description: Create, heal and destroy git worktrees in any repo — the portable worktree machinery behind `worktree:new`, `worktree:heal` and `worktree:remove`. Use when creating a worktree, spinning up a worktree for a branch or task, provisioning or self-healing a worktree, removing/deleting/tearing down/cleaning up a worktree, or when OPENTHROTTLE_WORKTREE_ROOT, `.worktree/provision.sh` or `.worktree/teardown.sh` are involved. Not for pruning many merged branches (see `github-cleanup`).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-14'
  version: '1.1.0'
name: ot-worktree
---

# ot-worktree

Git worktrees are how you run several branches of one repo side by side. Creating one is
`git worktree add`; making it _usable_ — dependencies, `.env`, ports, containers — is repo-specific
work git has no hook for. This skill owns the generic half and delegates the repo-specific half, so
every repo that has it creates, heals and destroys worktrees the same way.

## Three composable actions

Each verb is usable standalone and callable from the others. All three accept `-h`/`--help`.

| Action      | Script               | Job                                                   |
| ----------- | -------------------- | ----------------------------------------------------- |
| **create**  | `scripts/create.sh`  | Create the worktree, then provision it                |
| **heal**    | `scripts/heal.sh`    | Lazily provision a worktree created outside the skill |
| **destroy** | `scripts/destroy.sh` | Run teardown, remove the worktree, prune admin dirs   |

Shared internals: `scripts/common.sh` (logging, linked-worktree detection, name sanitization, target
validation), `scripts/root.sh` (the root ladder), `scripts/provision.sh` (repo-hook delegation).

## create — three invocation modes, auto-detected

1. **CLI** — name as `$1`. Never reads stdin.
2. **Hook payload** — no name arg and stdin is a pipe: the Claude Code `WorktreeCreate` JSON payload.
   The name comes from `.name // .worktree_name // .worktreeName // .worktree // .branch // .slug`,
   falling back to `wt-<first 8 of session_id>`. The raw payload is logged to `$TMPDIR`.
3. **Provision in place** — no name, no payload, run from _inside_ a linked worktree (Cursor creates
   the worktree itself, then runs a setup command with `cwd=$WORKTREE_PATH`). Provisions the current
   worktree; creates nothing.

Branch name is `${OPENTHROTTLE_WORKTREE_BRANCH_PREFIX:-openthrottle/}<name>`; an existing branch is checked out
rather than failing.

### What the new branch forks from

Highest rung first:

1. `--base <ref>` or `OPENTHROTTLE_WORKTREE_BASE` — explicit. `--base HEAD` forks from the primary
   checkout's current branch (to stack on your own work). A ref that does not resolve is a hard failure.
2. **The remote's default branch** — `refs/remotes/<remote>/HEAD` (remote from
   `OPENTHROTTLE_WORKTREE_REMOTE`, default `origin`); `<remote>/main` then `<remote>/master` as a local fallback.
3. `HEAD` — no remote, or no nameable default.

**No fetch happens**: rung 2 is your last-fetched ref, so create stays fast and offline-safe (the
`WorktreeCreate` hook blocks on it). The branch is created `--no-track`. `--base` is ignored, with a
warning, when the branch already exists or when provisioning in place.

### Provision options

`--own-db` sets `OPENTHROTTLE_WORKTREE_OWN_DB=1` for the repo's provisioner (the hook contract has no
argv channel); a provisioner that does not know it ignores it.

**Stdout contract:** `create.sh` prints _only_ the worktree's absolute path. Everything else is stderr.
Claude's `WorktreeCreate` hook depends on this.

Stdin is read only when it is a pipe or file, line by line with a 2s idle timeout, so an open pipe
that never closes cannot hang create.

## Where worktrees live

A **root** holding every repo's worktrees, with `<org>/<repo>` always organized beneath it:

```
~/.openthrottle/worktrees/acme/monorepo/feature-x
└──────── root ─────────┘└─ org/repo ─┘└─ worktree ─┘
```

The root, highest rung wins: `OPENTHROTTLE_WORKTREE_ROOT` in the environment; the same variable in
the target repo's `.env`; default `~/.openthrottle/worktrees`. There is deliberately no settings file.

The org comes from the repo's **git remote**, not its directory name (no remote: just `<repo>`).
Segments are sanitized to `[A-Za-z0-9._-]` and `.`/`..` are refused. A leading `~` is expanded,
trailing slashes stripped, and a non-absolute root is **rejected**. Worktrees created at an older
location are still found: every action reads `git worktree list`.

## The repo hook contract

The skill never knows how to set your repo up; it runs a repo-provided hook if one exists:

- **provision:** `$OPENTHROTTLE_WORKTREE_PROVISION`, then `.worktree/provision.sh`, then `scripts/setup_worktree.ts`, then `scripts/setup_worktree.sh`.
- **heal hook** (optional, idempotent, failure never fatal): `$OPENTHROTTLE_WORKTREE_HEAL`, then `.worktree/heal.sh`, then `scripts/heal_worktree.ts`.
- **teardown:** `$OPENTHROTTLE_WORKTREE_TEARDOWN`, then `.worktree/teardown.sh`.
- Hooks run with cwd = the worktree, stdin closed, stdout redirected to stderr, and `OPENTHROTTLE_SOURCE_REPO` / `OPENTHROTTLE_WORKTREE_NAME` / `OPENTHROTTLE_WORKTREE_PATH` exported.
- Nothing found: log and no-op. A non-zero exit is a failure: provisioning aborts creation, teardown aborts removal.

Read [references/contract.md](references/contract.md) when writing or debugging a hook.

## destroy — safety defaults

- **Refuses the primary checkout.** The target must be a registered _linked_ worktree of this repo.
- **Refuses a dirty tree** — prints what is dirty and requires an explicit `--force`.
- **Branch-preserving.** `--delete-branch` deletes it only if merged; `--delete-branch --force` otherwise.
- **`--dry-run`** prints exactly what would happen and removes nothing.
- Runs the teardown hook _before_ removal, then `git worktree prune`.

With no argument, run from inside a linked worktree, it removes itself (chdir'ing to the primary
checkout first). Exit codes: 0 success, 1 refused or failed.

## Gotchas

- The hook is read from the **worktree's** checkout, not the primary one: a worktree on a branch predating the hook will not run it.
- Heal runs before every `dev`, so a heal hook must stay cheap and idempotent.
- `create.sh` stdout must be only the path; log to stderr, in the script and in any hook.
- Removal that bypasses `destroy.sh` (`git worktree remove`, an editor's cleanup) leaves an OpenThrottle checkout record behind.

## In OpenThrottle repos

Only relevant where the OpenThrottle server and its `package.json` scripts exist.

- **Entrypoints:** `pnpm worktree:new <name>`, `pnpm worktree:heal` (also nx `monorepo:ensure-worktree`), `pnpm worktree:remove [name|path]`; the Claude `WorktreeCreate` hook and Cursor call the same scripts.
- **Provisioner:** OpenThrottle needs no `.worktree/provision.sh`: its `scripts/setup_worktree.ts` is found by rung 3 and run by bare Node (native type stripping). It ships `.worktree/teardown.sh`, which stops the worktree's docker compose project before removal.
- **Checkout record:** after a successful removal `scripts/deregister.sh` calls `deregisterWorktreeCheckout` with the path, resolving endpoint and token from the _primary_ checkout's `.env`, then the ambient environment, then `~/.openthrottle/.env`. Strictly fail-open: no `curl`, no endpoint or token, a server that is down, or a refused request each log one line and removal still succeeds. The server keeps the record while an unsettled plan run points at it, so settle a run before tearing down its worktree. `OPENTHROTTLE_WORKTREE_DEREGISTER=0` skips it. The repositories page flags records left by other removals "Missing on disk" and prunes them.
- **Outcome telemetry:** once, at the end — `error` if the action exited non-zero, `abandoned` if called off ([why](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)):

  ```bash
  r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill ot-worktree --outcome success; fi
  ```

## Adopting in another repo

Read [references/adopting.md](references/adopting.md) when wiring this skill into a repo that did not author it: syncing the skills, optional provision/teardown hooks, `package.json` entrypoints and the hook wiring.
