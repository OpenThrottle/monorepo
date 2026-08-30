---
description: Manage the OpenThrottle agent-skills architecture in any repo — install skills consistently, fan them out to every AI tool, and validate the layout. Use when installing or adding agent skills, syncing skills into agent folders, setting up skills in a new repo, checking skill layout drift, or when .agents/skills, .claude/skills, or skills-lock.json are involved.
metadata:
  author: openthrottle
  version: '1.0.0'
name: ot-skill-sync
---

# ot-skill-sync

This skill manages the **OpenThrottle agent-skills architecture** in whatever repository you're in. It exists so every AI tool — Claude Code, Cursor 2.4+, Codex, Grok Build, OpenCode, VSCode/Copilot, Gemini CLI, and anything else — sees the **same skills from the same starting point**, no matter which tool a teammate used to install them.

All of these CLIs read the **[Agent Skills](https://agentskills.io/) `SKILL.md` standard**; they differ only in which directories they scan, and the differences are wider than "two near-universal dirs" — so the fan-out list is derived from a verified matrix, not an assumption.

### Which CLI reads what (in-repo, verified 2026-08-26)

Read off the installed binaries/bundles at the versions shown — the CLIs' own shipped docs and path constants, not vendor marketing. Re-verify before changing the fan-out list.

| CLI                   | version    | `.agents/skills` | `.claude/skills` | its own in-repo dir                  | reached by this layout   |
| --------------------- | ---------- | :--------------: | :--------------: | ------------------------------------ | ------------------------ |
| claude (Claude Code)  | 2.1.232    |        —         |        ✅        | —                                    | ✅ fan-out               |
| cursor (cursor-agent) | 2026.08.11 |        ✅        |        ✅        | `.cursor/skills`                     | ✅ stage 1               |
| grok (Grok Build)     | 1.0.5      |        ✅        |        ✅        | `.grok/skills`                       | ✅ stage 1               |
| antigravity (`agy`)   | 1.1.21     |        ✅        |        —         | — (global `~/.gemini/config/skills`) | ✅ stage 1               |
| gemini (Gemini CLI)   | 0.25.2     |        —         |        —         | `.gemini/skills`                     | ✅ fan-out               |
| codex                 | 0.145.0    |        —         |        —         | — (global `$CODEX_HOME/skills`)      | ❌ no in-repo dir exists |
| opencode              | 1.18.16    |        —         |        —         | `.opencode/skill(s)`                 | ❌ not in the default    |

Notes on the two ❌ rows and the surprises above:

- **codex 0.145.0 has no in-repo skills dir at all.** Skills live only in `$CODEX_HOME/skills` (`~/.codex/skills`). Its `.agents/` handling is plugin-marketplace manifests, not skills. Nothing in-repo can reach it. (Cursor reads `.codex/skills` — that is Cursor's compat scan, not codex's own.)
- **opencode 1.18.16** reads project skills from `.opencode/skill(s)/<name>/SKILL.md`, and its "external" auto-scans are **home-scoped only** (`~/.claude/skills`, `~/.agents/skills` — disableable via `OPENCODE_DISABLE_EXTERNAL_SKILLS`). Add `.opencode/skill` to `AGENT_SKILL_DIRS` if a repo needs it; it is deliberately not a default.
- **Antigravity needs no fan-out.** `agy` discovers `<workspace>/.agents/skills/<name>/` natively (plus the global `~/.gemini/config/skills/` and an `.agents/skills.json` manifest), so stage 1 already covers it. Do **not** add a `.gemini/skills` expectation for `agy` — that is the _Gemini CLI's_ dir, and the two share nothing but the `~/.gemini` prefix.
- **Claude Code 2.1.232 does not read `.agents/skills`.** `.claude/skills` is its only in-repo skills dir, which is exactly why the fan-out exists.

Several CLIs additionally read per-tool **global** dirs (`~/.claude/skills`, `~/.codex/skills`, `~/.grok/skills`, `~/.gemini/skills`, `~/.gemini/config/skills`) that live outside any repo and are not part of this layout.

## The architecture

Every openthrottle repo has (at most) four skill locations with strict ownership:

| Location                                                 | Contents                                                                                                                                                                                                                                                                                                                      | Owned by                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `skills/`                                                | Hand-authored skills, committed to git                                                                                                                                                                                                                                                                                        | Humans (via PRs)            |
| `.agents/skills/`                                        | The merged SSOT view read in-repo by Cursor, Grok Build, and Antigravity (`agy`) — see the matrix above; Claude Code and the Gemini CLI reach it only via the fan-out. **Real directories** = external skills installed by `npx skills` (tracked in `skills-lock.json`). **Symlinks** = the repo's own `skills/*`, generated. | The skills CLI / this skill |
| `<agent>/skills/` (`.claude/skills/`, `.gemini/skills/`) | Per-agent fan-out for the CLIs that do **not** read `.agents/skills/` in-repo — Claude Code (`.claude/skills`) and the Gemini CLI (`.gemini/skills`). All symlinks, all generated, all gitignored.                                                                                                                            | This skill                  |
| `~/.openthrottle/skills/` (**outside the repo**)         | The per-user **personal tier**: private, half-finished, experimental skills. Linked in by sync and reaching every place a committed skill does, while being structurally impossible to commit. Override with `OPENTHROTTLE_PERSONAL_SKILLS_DIR`.                                                                              | You, and nobody else        |

Sync is a three-stage pipeline: `skills/*` → `.agents/skills/` (stage 1), `<personal>/*` → `.agents/skills/` (stage 1b), then `.agents/skills/*` → each agent folder (stage 2). A name collision between `skills/` and `skills-lock.json` is an **error**, never a silent precedence.

### The personal tier

Opt-in is **presence**: create `~/.openthrottle/skills/<name>/SKILL.md` and the next sync picks it up. There is deliberately no enable/disable env var for it — creating the directory is already the deliberate act. (`OPENTHROTTLE_PERSONAL_SKILLS_ENABLED` is a different thing entirely: the foreign-repo injection toggle.) A missing or empty root is a clean no-op on every path, which is what CI sees.

**Uncommittable, twice over.** The content never enters the worktree, and the only in-repo artifact is a symlink the managed `.gitignore` block already covers. Neither is left to luck: `--check` runs `git check-ignore` on every personal link, and a Husky pre-commit guard refuses to stage one.

**Collisions are a hard error**, not a precedence rule:

```
✗ personal skill 'x' collides with committed skills/x
```

Rename it, or pass `--allow-shadow` to deliberately run a private fork of a team skill. Silently running your own variant of a skill your colleagues also invoke is the failure this prevents.

**Per-CLI reach is unchanged.** Personal skills ride the same stage 2, so they land wherever a committed skill lands — no special case downstream.

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

# Personal tier: scaffold, inspect, and graduate your own private skills
bash <path-to-this-skill>/scripts/personal.sh new <name>       # scaffold + sync + how to invoke it
bash <path-to-this-skill>/scripts/personal.sh list             # what you have, and where it links
bash <path-to-this-skill>/scripts/personal.sh promote <name>   # move it into skills/, re-sync, stage it
bash <path-to-this-skill>/scripts/personal.sh demote <name>    # the inverse, for promoting too early
```

When installed, `<path-to-this-skill>` is `.agents/skills/ot-skill-sync`; in the OpenThrottle repo itself it's `skills/ot-skill-sync`.

These scripts create symlinks and maintain a single static `.gitignore` block so generated links are never committed. That is their entire write surface. There is no side-ledger: a symlink under `.agents/skills/` or an agent folder _is_ a generated link (a real directory there is an external install), so the sync reconciles renames and removals straight from the filesystem.

## What `--check` validates

1. Every `skills/<name>/` (with a `SKILL.md`) is exported to `.agents/skills/<name>`
2. Every `skills-lock.json` entry is materialized in `.agents/skills/`
3. `.agents/skills/` contains nothing else (real dir ⇒ lockfile entry; symlink ⇒ points into `skills/`)
4. No name collisions between `skills/` and the lockfile
5. Agent folders contain exactly the `.agents/skills/` set, and no _generated_ fan-out dir exists outside the configured `AGENT_SKILL_DIRS` list. (This is about keeping the generated layout deterministic — not a judgment on any CLI: Cursor, Grok, and Antigravity all read `.agents/skills/` natively. A `-a cursor`-style install that drops a stray `.cursor/skills` fan-out is drift only because it's an un-configured generated target, so route those tools through `.agents/skills/` / the configured fan-out instead.)
6. The static `.gitignore` block is present and every generated symlink is gitignored
7. No dangling generated links, and no legacy `.gitignore-symlinks` ledger remains
8. Every personal link is git-ignored (asserted with `git check-ignore`, never a `test -e`, which follows parent symlinks and passes vacuously), points into the **currently-resolved** personal root, and is not dangling

## Configuration

Per-agent fan-out targets default to **`.claude/skills .gemini/skills`** — one dir per CLI that cannot see `.agents/skills/` in-repo:

- `.claude/skills` — Claude Code's only in-repo skills dir (also read by Cursor and Grok, so it is doubly useful).
- `.gemini/skills` — the Gemini CLI's only in-repo skills dir (project scope; `~/.gemini/skills` is its user scope and out of this layout).

The personal root is configured the same way, and defaults to `~/.openthrottle/skills`:

```bash
OPENTHROTTLE_PERSONAL_SKILLS_DIR=/path/to/my/skills bash <path>/scripts/sync.sh
```

It must live **outside** the repo — sync refuses a root inside it, since the whole guarantee is that its content is not in the worktree.

CLIs that read `.agents/skills/` natively — Cursor, Grok Build, Antigravity (`agy`) — need no fan-out. codex has no in-repo skills dir to target at all. Override per repo — without editing this skill — via a space-separated env var:

```bash
# e.g. add opencode's project skills dir, or a Windsurf target
AGENT_SKILL_DIRS=".claude/skills .gemini/skills .opencode/skill" bash <path>/scripts/sync.sh
```

## Setting up a new repo

1. `npx skills add openthrottle/monorepo --skill ot-skill-sync` (default agents — the bootstrap exception)
2. Install any other skills with `--agent universal`
3. Run `sync.sh`, commit the resulting `.gitignore` changes
4. Add `sync.sh && sync.sh --check` to CI as the drift gate
