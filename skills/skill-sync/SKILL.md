---
description: Manage the OpenThrottle agent-skills architecture in any repo — install skills consistently, fan them out to every AI tool, and validate the layout. Use when installing or adding agent skills, syncing skills into agent folders, setting up skills in a new repo, checking skill layout drift, or when .agents/skills, .claude/skills, or skills-lock.json are involved.
metadata:
  author: openthrottle
  version: '1.0.0'
name: skill-sync
---

# skill-sync

This skill manages the **OpenThrottle agent-skills architecture** in whatever repository you're in. It exists so every AI tool — Claude Code, Cursor 2.4+, Codex, Grok Build, OpenCode, VSCode/Copilot, Gemini CLI, and anything else — sees the **same skills from the same starting point**, no matter which tool a teammate used to install them.

All of these CLIs now read the **`SKILL.md` standard**; they differ only in which directories they scan. `.agents/skills/` and `.claude/skills/` are the two near-universal in-repo targets (`.agents/skills/` for Claude Code, Cursor, Codex, OpenCode; `.claude/skills/` for Claude Code, Cursor, Grok Build). Several also read per-tool global dirs (`~/.claude/skills`, `~/.codex/skills`, `~/.grok/skills`) that live outside any repo and are not part of this layout.

## The architecture

Every openthrottle repo has (at most) three skill locations with strict ownership:

| Location                                   | Contents                                                                                                                                                                                                                                        | Owned by                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `skills/`                                  | Hand-authored skills, committed to git                                                                                                                                                                                                          | Humans (via PRs)            |
| `.agents/skills/`                          | The merged SSOT view most CLIs read in-repo (Claude Code, Cursor 2.4+, Codex, OpenCode). **Real directories** = external skills installed by `npx skills` (tracked in `skills-lock.json`). **Symlinks** = the repo's own `skills/*`, generated. | The skills CLI / this skill |
| `<agent>/skills/` (e.g. `.claude/skills/`) | Per-agent fan-out for CLIs that read a `.claude`-style dir rather than `.agents/skills/` (e.g. Grok Build; Cursor reads both). All symlinks, all generated, all gitignored.                                                                     | This skill                  |

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
5. Agent folders contain exactly the `.agents/skills/` set, and no _generated_ fan-out dir exists outside the configured `AGENT_SKILL_DIRS` list. (This is about keeping the generated layout deterministic — not a judgment on any CLI: Cursor, Codex, and Grok all read skills natively. A `-a cursor`-style install that drops a stray `.cursor/skills` fan-out is drift only because it's an un-configured generated target, so route those tools through `.agents/skills/` / the configured fan-out instead.)
6. The static `.gitignore` block is present and every generated symlink is gitignored
7. No dangling generated links, and no legacy `.gitignore-symlinks` ledger remains

## Configuration

Per-agent fan-out targets default to `.claude/skills` — the near-universal `.claude`-style target that serves Claude Code, Cursor, and Grok Build. CLIs that read `.agents/skills/` in-repo (Claude Code, Cursor, Codex, OpenCode) need no extra fan-out. Override per repo — without editing this skill — via a space-separated env var:

```bash
AGENT_SKILL_DIRS=".claude/skills .windsurf/skills" bash <path>/scripts/sync.sh
```

## Setting up a new repo

1. `npx skills add openthrottle/monorepo --skill skill-sync` (default agents — the bootstrap exception)
2. Install any other skills with `--agent universal`
3. Run `sync.sh`, commit the resulting `.gitignore` changes
4. Add `sync.sh && sync.sh --check` to CI as the drift gate
