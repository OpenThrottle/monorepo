# 🔄 ot-skill-sync

The skill that manages our **agent-skills architecture** — install it in any OpenThrottle repo and every AI tool (Claude Code, Cursor, Codex, Grok Build, OpenCode, VSCode/Copilot, Gemini CLI, …) gets the same skills, laid out the same way, kept out of git.

> [!TIP]
>
> This skill exists to prevent _inconsistent_ installs — e.g. one teammate installing a skill "for Cursor" and another "for Claude." Everything installs to one place (`.agents/skills/`), and the sync fans it out deterministically.

## The layout it manages

```mermaid
flowchart LR
  A["skills/&lt;name&gt;<br/><i>authored, committed</i>"]
  P["~/.openthrottle/skills/&lt;name&gt;<br/><i>personal, outside the repo</i>"]
  B[".agents/skills/&lt;name&gt;<br/><i>merged SSOT view</i>"]
  C[".claude/skills/&lt;name&gt;<br/><i>per-agent fan-out<br/>AGENT_SKILL_DIRS</i>"]
  D[".gemini/skills/&lt;name&gt;<br/><i>per-agent fan-out<br/>AGENT_SKILL_DIRS</i>"]
  A -->|stage 1| B -->|stage 2| C
  P -->|stage 1b| B
  B -->|stage 2| D
```

- **`skills/`** — skills this repo authors (committed).
- **`.agents/skills/`** — the merged SSOT view, read in-repo by Cursor, Grok Build, and Antigravity (`agy`): real directories are `npx skills` installs (lockfile-owned, never touched by the sync); symlinks are the repo's own `skills/*` (generated). A name collision between the two is an error.
- **`.claude/skills/`** and **`.gemini/skills/`** (and any other configured agent folders) — generated symlinks for the CLIs that cannot see `.agents/skills/` in-repo: Claude Code reads only `.claude/skills`, and the Gemini CLI reads only `.gemini/skills`. See [SKILL.md](./SKILL.md) § "Which CLI reads what" for the verified per-CLI matrix, including codex (no in-repo skills dir at all) and opencode (`.opencode/skill(s)`, not a default). Several CLIs additionally read per-tool global dirs (`~/.claude/skills`, `~/.codex/skills`, `~/.grok/skills`, `~/.gemini/skills`, `~/.gemini/config/skills`), which are outside this repo's layout.

- **`~/.openthrottle/skills/`** — the per-user **personal tier**, outside the repo entirely (override with `OPENTHROTTLE_PERSONAL_SKILLS_DIR`). Private, half-finished, experimental skills that reach every place a committed skill does and can never be committed: the content is not in the worktree, and the generated links are gitignored, asserted by `--check` and by a pre-commit guard. Opt-in is presence — no toggle. A name already owned by `skills/` or the lockfile is a hard error unless you pass `--allow-shadow`.

Skills travel between repos by **install, never by symlink** — each repo runs `npx skills add openthrottle/monorepo --skill <name> --agent universal` and owns its own lockfile.

## Quick start

```bash
# One-time, in any OpenThrottle repo (note: no --agent flag for THIS skill)
npx skills add openthrottle/monorepo --skill ot-skill-sync

# Everything else installs universal-only
npx skills add <owner>/<repo> --skill <name> --agent universal

# Build the layout (idempotent)
bash .agents/skills/ot-skill-sync/scripts/sync.sh

# Validate it (CI drift gate — exits 1 on violations)
bash .agents/skills/ot-skill-sync/scripts/sync.sh --check

# Tear it down
bash .agents/skills/ot-skill-sync/scripts/cleanup.sh

# Start a private skill of your own (uncommittable until you promote it)
bash .agents/skills/ot-skill-sync/scripts/personal.sh new my-idea
bash .agents/skills/ot-skill-sync/scripts/personal.sh list
bash .agents/skills/ot-skill-sync/scripts/personal.sh promote my-idea
```

## Configuration

`AGENT_SKILL_DIRS` (space-separated env var) overrides the fan-out targets without editing the installed skill — default is `.claude/skills .gemini/skills`:

```bash
AGENT_SKILL_DIRS=".claude/skills .gemini/skills .opencode/skill" bash .agents/skills/ot-skill-sync/scripts/sync.sh
```

`OPENTHROTTLE_PERSONAL_SKILLS_DIR` overrides the personal root (default `~/.openthrottle/skills`). It must be outside the repo — sync refuses a root inside it, because the guarantee is that its content is not in the worktree. A missing or empty root is a clean no-op, which is what CI sees.

## What it writes

Symlinks and a single static `.gitignore` block — nothing else. The block is deterministic and never churns per-skill:

```gitignore
# Agent resources - ot-skill-sync
.agents/skills/*
!.agents/skills/*/
.claude/skills/
.gemini/skills/
```

`.agents/skills/*` + `!.agents/skills/*/` ignores our authored symlinks while keeping the external install _directories_ committed (git treats a symlink as a file, not a directory); each fan-out dir (`.claude/skills/` by default) is fully generated, so it's ignored wholesale. There is **no** `.gitignore-symlinks` ledger — on-disk type is the source of truth (symlink = generated, real dir = external install), so the sync derives renames and removals from the filesystem. `.agents/skills/` real directories and `skills-lock.json` are never touched, so the skills CLI's lockfile stays authoritative for external skills.

## In the OpenThrottle repo itself

The skill runs from its source location (`bash skills/ot-skill-sync/scripts/sync.sh`), and CI runs sync + `--check` on every PR as the **agent-skills SSOT drift gate**. The `scripts/symlink-*.sh` entry points are thin wrappers that delegate here, kept for service `setup.sh` compatibility.

See [`SKILL.md`](./SKILL.md) for the full rules and the invariants `--check` enforces.
