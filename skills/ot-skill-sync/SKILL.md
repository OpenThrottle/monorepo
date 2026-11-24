---
name: ot-skill-sync
description: Manage the agent-skills layout in a repo — install skills, fan them out to every AI tool, and validate the layout. USE WHEN installing or adding agent skills, syncing skills into agent folders, setting up skills in a new repo, checking skill layout drift, or when .agents/skills, .claude/skills or skills-lock.json are involved. Not for authoring or reviewing a skill (ot-skill-guide).
compatibility: Requires bash, git, a symlink-capable filesystem, and npx (the skills CLI) for installing external skills.
metadata:
  author: openthrottle
  last-reviewed: '2026-11-22'
  version: '1.3.0'
---

# ot-skill-sync

This skill manages the **OpenThrottle agent-skills architecture** in whatever repository you're in, so every AI tool — Claude Code, Cursor, Codex, Grok Build, OpenCode, VSCode/Copilot, Antigravity — sees the **same skills from the same starting point**, no matter which tool a teammate used to install them.

All of these CLIs read the [Agent Skills](https://agentskills.io/) `SKILL.md` standard; they differ only in which directories they scan. In short: Cursor, Grok Build and Antigravity (`agy`) read `.agents/skills/` natively; Claude Code reads only `.claude/skills/`, which is why the fan-out exists; codex has no in-repo skills dir at all. Read [references/cli-matrix.md](references/cli-matrix.md) before changing the `AGENT_SKILL_DIRS` defaults.

## The architecture

Every repo has these skill locations with strict ownership:

| Location                                         | Contents                                                                                                                                                                                                                                                                                                     | Owned by                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `skills/`                                        | Hand-authored skills, committed to git                                                                                                                                                                                                                                                                       | Humans (via PRs)            |
| `.agents/skills/`                                | The merged SSOT view read in-repo by Cursor, Grok Build, and Antigravity (`agy`) — see the matrix above; Claude Code reaches it only via the fan-out. **Real directories** = external skills installed by `npx skills` (tracked in `skills-lock.json`). **Symlinks** = the repo's own `skills/*`, generated. | The skills CLI / this skill |
| `<agent>/skills/` (`.claude/skills/`)            | Per-agent fan-out for the CLIs that do **not** read `.agents/skills/` in-repo — Claude Code (`.claude/skills`). All symlinks, all generated, all gitignored.                                                                                                                                                 | This skill                  |
| `~/.openthrottle/skills/` (**outside the repo**) | The per-user **personal tier**: private, half-finished, experimental skills. Linked in by sync and reaching every place a committed skill does, while being structurally impossible to commit. Override with `OPENTHROTTLE_PERSONAL_SKILLS_DIR`.                                                             | You, and nobody else        |

Sync is a three-stage pipeline: `skills/*` → `.agents/skills/` (stage 1), `<personal>/*` → `.agents/skills/` (stage 1b), then `.agents/skills/*` → each agent folder (stage 2). A name collision between `skills/` and `skills-lock.json` is an **error**, never a silent precedence.

### The personal tier

Opt-in is **presence**: create `~/.openthrottle/skills/<name>/SKILL.md` and the next sync picks it up. There is no enable/disable env var; a missing or empty root is a clean no-op (which is what CI sees). The content never enters the worktree, and `--check` runs `git check-ignore` on every personal link. A personal skill whose name collides with `skills/<name>` is a hard error (`✗ personal skill 'x' collides with committed skills/x`): rename it, or pass `--allow-shadow` to deliberately run a private fork. Personal skills ride the same stage 2, so they land wherever a committed skill lands.

## Rules to enforce

1. **ALWAYS** install external skills with `--agent universal` so they land only in `.agents/skills/`:

   ```bash
   npx skills add <owner>/<repo> --skill <skill_name> --agent universal
   ```

   **Exception:** this skill itself is installed with default agent detection (no `--agent` flag), so the agent can discover it before the first sync has ever run.

2. **ALWAYS** run a sync after installing, adding, renaming, or removing a skill.
3. **NEVER** hand-edit `.agents/skills/` or any `<agent>/skills/` folder — author skills in `skills/`, install external ones with the CLI, and let the sync generate the rest.

## Commands

All scripts live in this skill's `scripts/` directory and operate on the **current repo** (found via `git rev-parse --show-toplevel`). Every entry script takes `-h`/`--help`; `scripts/common.sh` holds their shared helpers.

```bash
bash <path-to-this-skill>/scripts/sync.sh                  # build/refresh the layout (idempotent)
bash <path-to-this-skill>/scripts/sync.sh --check          # validate, write nothing; the CI drift gate (run sync first)
bash <path-to-this-skill>/scripts/check-links.sh           # every relative link in a skill body resolves
bash <path-to-this-skill>/scripts/cleanup.sh --dry-run     # list generated links cleanup would remove
bash <path-to-this-skill>/scripts/cleanup.sh               # remove everything sync generated (never touches targets)

# Personal tier: scaffold, inspect, and graduate your own private skills
bash <path-to-this-skill>/scripts/personal.sh new <name>       # scaffold + sync + how to invoke it
bash <path-to-this-skill>/scripts/personal.sh list             # what you have, and where it links
bash <path-to-this-skill>/scripts/personal.sh promote <name>   # move it into skills/, re-sync, stage it
bash <path-to-this-skill>/scripts/personal.sh demote <name>    # the inverse, for promoting too early
```

`<path-to-this-skill>` is `.agents/skills/ot-skill-sync` when installed, `skills/ot-skill-sync` in the repo that authors it.

**Exit codes:** `0` = ok; `1` = drift found (`sync.sh --check`, `check-links.sh`) or a usage/setup error. `--help` exits `0`.

The scripts only create symlinks and maintain a single static `.gitignore` block, so generated links are never committed. There is no side-ledger: a symlink under `.agents/skills/` or an agent folder _is_ a generated link (a real directory there is an external install).

## What `--check` validates

1. Every `skills/<name>/` (with a `SKILL.md`) is exported to `.agents/skills/<name>`
2. Every `skills-lock.json` entry is materialized in `.agents/skills/`
3. `.agents/skills/` contains nothing else (real dir ⇒ lockfile entry; symlink ⇒ points into `skills/`)
4. No name collisions between `skills/` and the lockfile
5. Agent folders contain exactly the `.agents/skills/` set, and no _generated_ fan-out dir exists outside the configured `AGENT_SKILL_DIRS` list (a stray `.cursor/skills` from a `-a cursor` install is drift because it is an un-configured generated target)
6. The static `.gitignore` block is present and every generated symlink is gitignored
7. No dangling generated links, and no legacy `.gitignore-symlinks` ledger remains
8. Every personal link is git-ignored (`git check-ignore`), points into the currently-resolved personal root, and is not dangling

`check-links.sh` covers what `--check` never opens: it resolves every relative markdown link in a skill body from the directory of the file containing it and fails naming the file, line and target. Absolute URLs, `mailto:`, bare `#anchor` links and fenced code blocks are skipped; fragments are stripped, not validated.

## Configuration

Fan-out targets default to **`.claude/skills`** (Claude Code's only in-repo skills dir). Override per repo with a space-separated env var:

```bash
AGENT_SKILL_DIRS=".claude/skills .opencode/skill" bash <path>/scripts/sync.sh
```

The personal root defaults to `~/.openthrottle/skills`; it must live **outside** the repo (sync refuses one inside it):

```bash
OPENTHROTTLE_PERSONAL_SKILLS_DIR=/path/to/my/skills bash <path>/scripts/sync.sh
```

## Setting up a new repo

1. `npx skills add openthrottle/monorepo --skill ot-skill-sync` (default agents — the bootstrap exception)
2. Install any other skills with `--agent universal`
3. Run `sync.sh`, commit the resulting `.gitignore` changes
4. Add `sync.sh && sync.sh --check` to CI as the drift gate

## In OpenThrottle repos

- **Report the outcome when `sync.sh --check` passes** ([why](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)): `success`; `error` if it still
  fails when you stop; `abandoned` if no layout change was needed. Fail-open in any repo.

  ```bash
  r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill ot-skill-sync --outcome success; fi
  ```

- OT's shared skills come from `openthrottle/monorepo`, lockfile-managed per repo: `npx skills add openthrottle/monorepo --skill <skill_name> --agent universal`.
- `personal.sh promote` prints OT-only follow-ups (the OT-owned list and description budget in `docs/Skills.md`, and the `monorepo` commit scope) when `docs/Skills.md` exists in the repo root.
- `OPENTHROTTLE_PERSONAL_SKILLS_ENABLED` is a different thing entirely: the foreign-repo injection toggle, not a switch for the personal tier.

## Gotchas

- **A sync under a temporary `OPENTHROTTLE_PERSONAL_SKILLS_DIR` deletes the links to your real
  personal skills.** Stage 1 prunes every personal link that does not point into the currently
  resolved root, so a test or script that points the variable at a fixture unlinks the real ones,
  and the next `--check` reports them as drift. Restore the variable before the final re-sync;
  repair with `env -u OPENTHROTTLE_PERSONAL_SKILLS_DIR bash <path>/scripts/sync.sh`.
- **A `--check` run under a fixture root is meaningless as a pre-flight** for the same reason: it
  reports your real personal skills as missing. Assert `--check` only after the operation under
  test, under the same root.
