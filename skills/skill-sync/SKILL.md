---
description: Manage the OpenThrottle agent-skills architecture in any repo — install skills consistently, fan them out to every AI tool, and validate the layout. Use when installing or adding agent skills, syncing skills into agent folders, setting up skills in a new repo, checking skill layout drift, or when .agents/skills, .claude/skills, or skills-lock.json are involved.
metadata:
  author: openthrottle
  openthrottle-arguments: '[{"name":"mode","type":"enum","enum":["install","sync","validate"],"description":"Which skill-sync operation to run","required":true},{"name":"skill","type":"text","description":"Optional skill slug to target"}]'
  version: '1.0.0'
name: skill-sync
---

# skill-sync

This skill manages the **OpenThrottle agent-skills architecture** in whatever repository you're in. It exists so every AI tool — Cursor, Claude Code, VSCode/Copilot, Gemini CLI, OpenCode, and anything else — sees the **same skills from the same starting point**, no matter which tool a teammate used to install them.

## The architecture

Every openthrottle repo has (at most) three skill locations with strict ownership:

| Location                                   | Contents                                                                                                                                                                                              | Owned by                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `skills/`                                  | Hand-authored skills, committed to git                                                                                                                                                                | Humans (via PRs)            |
| `.agents/skills/`                          | The merged SSOT view all universal tools read. **Real directories** = external skills installed by `npx skills` (tracked in `skills-lock.json`). **Symlinks** = the repo's own `skills/*`, generated. | The skills CLI / this skill |
| `<agent>/skills/` (e.g. `.claude/skills/`) | Per-agent fan-out for tools that don't read `.agents/skills/` natively. All symlinks, all generated, all gitignored.                                                                                  | This skill                  |

Sync is a two-stage pipeline: `skills/*` → `.agents/skills/` (stage 1), then `.agents/skills/*` → each agent folder (stage 2). A name collision between `skills/` and `skills-lock.json` is an **error**, never a silent precedence.

## Rules to enforce

1. **ALWAYS** install external skills with `--agent universal` so they land only in `.agents/skills/`:

   ```bash
   npx skills add <owner>/<repo> --skill <skill_name> --agent universal
   ```

   **Exception:** this skill itself is installed with default agent detection (no `--agent` flag), so the agent can discover it before the first sync has ever run.

2. **ALWAYS** run a sync after installing, adding, renaming, or removing a skill.
3. **NEVER** hand-edit `.agents/skills/` or any `<agent>/skills/` folder — author skills in `skills/`, install external ones with the CLI, and let the sync generate the rest.
4. OpenThrottle's shared skills are installed from `openthrottle/monorepo`, lockfile-managed per repo:

   ```bash
   npx skills add openthrottle/monorepo --skill <skill_name> --agent universal
   ```

## Commands

All scripts live in this skill's `scripts/` directory and operate on the **current repo** (found via `git rev-parse --show-toplevel`). From anywhere inside a repo:

```bash
# Sync: build/refresh the two-stage layout (idempotent, safe to re-run)
bash <path-to-this-skill>/scripts/sync.sh

# Check: validate the layout without writing anything; exit 1 on drift.
# Use in CI as the "agent skills SSOT drift" gate (run sync first).
bash <path-to-this-skill>/scripts/sync.sh --check

# Cleanup: remove everything sync generated (never touches targets)
bash <path-to-this-skill>/scripts/cleanup.sh
```

When installed, `<path-to-this-skill>` is `.agents/skills/skill-sync`; in the OpenThrottle repo itself it's `skills/skill-sync`.

These scripts create symlinks and maintain a single static `.gitignore` block so generated links are never committed. That is their entire write surface. There is no side-ledger: a symlink under `.agents/skills/` or an agent folder _is_ a generated link (a real directory there is an external install), so the sync reconciles renames and removals straight from the filesystem.

## What `--check` validates

1. Every `skills/<name>/` (with a `SKILL.md`) is exported to `.agents/skills/<name>`
2. Every `skills-lock.json` entry is materialized in `.agents/skills/`
3. `.agents/skills/` contains nothing else (real dir ⇒ lockfile entry; symlink ⇒ points into `skills/`)
4. No name collisions between `skills/` and the lockfile
5. Agent folders contain exactly the `.agents/skills/` set, and no agent skill dir exists outside the configured list (catches per-tool installs like `-a cursor`)
6. The static `.gitignore` block is present and every generated symlink is gitignored
7. No dangling generated links, and no legacy `.gitignore-symlinks` ledger remains

## Configuration

Per-agent fan-out targets default to `.claude/skills` (most tools read `.agents/skills/` natively and need nothing). Override per repo — without editing this skill — via a space-separated env var:

```bash
AGENT_SKILL_DIRS=".claude/skills .windsurf/skills" bash <path>/scripts/sync.sh
```

## Setting up a new repo

1. `npx skills add openthrottle/monorepo --skill skill-sync` (default agents — the bootstrap exception)
2. Install any other skills with `--agent universal`
3. Run `sync.sh`, commit the resulting `.gitignore` changes
4. Add `sync.sh && sync.sh --check` to CI as the drift gate
