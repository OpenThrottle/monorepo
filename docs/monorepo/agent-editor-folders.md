# Agent and editor folders — contributor reference

**Plan-Id:** `318f9dd8-f36c-4d1a-9826-7f8cf14a5e2c` (SSOT migration) · `a55015f4-1d17-4f79-9772-d3f4788f8cfc` (inventory)

Single entry point for **where agent- and editor-specific config lives** in the OpenThrottle monorepo: folder layout, **`.agents/` SSOT**, symlink views for editors, and where to edit for common tasks.

**Canonical layout (post-migration):** [agent-assets-canonical-layout.md](./agent-assets-canonical-layout.md)

**Deep dives (same plan, linked — not duplicated here):**

| Document                                                                             | Scope                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [agent-editor-folders-inventory.md](./agent-editor-folders-inventory.md)             | Full tree, per-path purpose, audiences, git tracking         |
| [agent-editor-folders-duplication-map.md](./agent-editor-folders-duplication-map.md) | Historical duplicates (pre-SSOT); drift watch list           |
| [agent-editor-folders-ownership.md](./agent-editor-folders-ownership.md)             | Canonical source of truth per concern, editor-unique content |

**Related entry points (different concerns — link, don’t fork):**

| Document                                                 | Scope                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [AGENTS.md](../../AGENTS.md)                             | Cross-editor handbook: Nx, OT skills index, workflow-ralph CLI, code-style pointer |
| [CLAUDE.md](../../CLAUDE.md)                             | Claude Code project entry; defers shared facts to `AGENTS.md`                      |
| [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md)    | What agents should load: rules list, example commands, discoverability spec        |
| [AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)      | Authoritative `@tools/generators` usage                                            |
| [.agents/rules/README.md](../../.agents/rules/README.md) | Rules layout, agent behavior (OT-only plans, generators first)                     |

---

## 1. Folder tree (overview)

```bash
repo root
├── AGENTS.md, CLAUDE.md              # Cross-editor entry points (edit in place)
├── .workflow-ralph.json.example      # Ralph CLI local defaults (example)
├── skills/                           # agentskills.io — symlinks → .agents/skills/
├── .agents/                          # ★ SSOT — sole write location for skills + rules
│   ├── skills/                       # All SKILL.md bodies (36 slugs)
│   ├── rules/                        # All rule bodies (*.mdc)
│   ├── personas/                     # Role prompts (architect, product, …)
│   ├── prompts/                      # Ad-hoc prompt fragments
│   └── hooks/format.sh               # Shared hook script (optional)
├── .cursor/
│   ├── rules/                        # Symlinks → .agents/rules/ (Cursor activation)
│   ├── skills/                       # Symlinks → .agents/skills/ (slash discovery)
│   ├── agents/                       # Cursor subagent definitions
│   ├── hooks/ + hooks.json           # afterFileEdit → format.sh
│   ├── mcp.json.example              # openthrottle-mcp template
│   ├── settings.json, worktrees.json
├── .claude/
│   ├── settings.json                 # Permissions, MCP enablement
│   └── skills/                       # Symlinks → .agents/skills/
├── .opencode/
│   ├── ocx.jsonc, commands/, plugins/
│   ├── agents/, skills/              # Partial manual copies — align in plan 1.5
└── .vscode/
    ├── settings.json.default, extensions.json, launch.json, mcp.json
```

**Skill counts:** `.agents/skills` **36** slugs (SSOT) · `.cursor/skills` / `.claude/skills` / `skills/` — **symlinks only** (same slugs)

**Developer app discovery:** `openthrottle-developer` scans `.agents/skills` and `.cursor/skills` — both resolve to the same bodies via symlinks.

**CI drift guard:** `pnpm nx run monorepo:check-agent-assets-ssot` — fails if editor trees contain non-symlink copies. See [agent-assets-canonical-layout.md §7](./agent-assets-canonical-layout.md#7-migration-sequence-task-84ed557c).

---

## 2. Audiences and primary locations

| Audience                   | Primary config                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Contributors (write)**   | `.agents/skills/`, `.agents/rules/`                                                            |
| **Cursor IDE (load)**      | `.cursor/rules/`, `.cursor/skills/` (symlinks), `.cursor/hooks.json`, local `.cursor/mcp.json` |
| **Claude Code (load)**     | `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/` (symlinks)                             |
| **Ralph / workflow-ralph** | `.cursor/skills/agents-ralph/SKILL.md` → `.agents/skills/agents-ralph/`, OT MCP                |
| **OpenCode**               | `.opencode/` (skills, commands, plugins, agents) — partial parity; plan 1.5                    |
| **Generic agentskills.io** | Repo-root `skills/` (symlinks → `.agents/skills/`)                                             |
| **Humans**                 | `CONTRIBUTING.md`, `.agents/rules/README.md`, this doc                                         |

---

## 3. Canonical ownership (summary)

**Edit `.agents/` only** for skill and rule bodies. Editor folders are read-only symlink views.

| Concern                               | Canonical (write)                                                                        | Load path (symlink view)                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Code style                            | [`.agents/rules/coding/`](../../.agents/rules/coding/)                                   | `.cursor/rules/coding/`                                |
| OT / GitHub / Ralph command behavior  | [`.agents/rules/commands/`](../../.agents/rules/commands/)                               | `.cursor/rules/commands/`                              |
| Generator-first workflow              | [`.agents/rules/personal-generators.mdc`](../../.agents/rules/personal-generators.mdc)   | `.cursor/rules/personal-generators.mdc`                |
| Rules index & agent behavior          | [`.agents/rules/README.md`](../../.agents/rules/README.md)                               | `.cursor/rules/README.md`                              |
| All skills (slash, deep, contributor) | [`.agents/skills/<slug>/`](../../.agents/skills/)                                        | `.cursor/skills/`, `.claude/skills/`, `skills/`        |
| Personas                              | [`.agents/personas/`](../../.agents/personas/)                                           | Ralph `--prompt-file`                                  |
| Ralph loop prompt                     | [`.agents/skills/agents-ralph/SKILL.md`](../../.agents/skills/agents-ralph/SKILL.md)     | `.cursor/skills/agents-ralph/` (stable Ralph CLI path) |
| Ralph CLI & queue docs                | [`.agents/skills/workflow-ralph/SKILL.md`](../../.agents/skills/workflow-ralph/SKILL.md) | `AGENTS.md`, workflow docs                             |
| Cross-editor handbook                 | [`AGENTS.md`](../../AGENTS.md)                                                           | `CLAUDE.md` defers here                                |
| MCP registration guide (SSOT)         | [`docs/openthrottle/mcp-registration.md`](../openthrottle/mcp-registration.md)           | —                                                      |
| MCP template (openthrottle-mcp only)  | [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example)                             | Local `.cursor/mcp.json`                               |

Full table and editor-unique paths: [ownership doc](./agent-editor-folders-ownership.md).

---

## 4. Duplication matrix (post-SSOT)

**Sync mechanism:** **symlinks only** — no copied bodies. Create/repair editor symlinks (skills → `.cursor`/`.claude`/`skills`; rules → `.cursor/rules`) with [`scripts/link-agent-assets.sh`](../../scripts/link-agent-assets.sh) (idempotent fixer, scope flags `--skills-only`/`--rules-only`; run after any skill install — e.g. skills.sh — that drops a new slug into `.agents/`). Drift is a **CI failure** (`check-agent-assets-ssot`).

| Relationship                | Locations                                   | Notes                                              |
| --------------------------- | ------------------------------------------- | -------------------------------------------------- |
| **Symlink view**            | `.cursor/skills` → `.agents/skills`         | 36 slugs; Cursor slash discovery                   |
| **Symlink view**            | `.claude/skills` → `.agents/skills`         | Claude Code parity                                 |
| **Symlink view**            | `skills/` → `.agents/skills`                | agentskills.io repo-root discovery                 |
| **Symlink view**            | `.cursor/rules/**/*.mdc` → `.agents/rules/` | Cursor rule activation; keep `.mdc` extension      |
| **Intentional split**       | `ot-*` slash vs `ot-plans` thick skill      | Both under `.agents/skills/`                       |
| **Editor-native (no SSOT)** | `.cursor/hooks.json`, `mcp.json`, worktrees | Not symlinked                                      |
| **Deferred (plan 1.5)**     | `.opencode/skills`                          | Manual copies remain until OpenCode symlink parity |

Historical pre-SSOT duplication: [duplication map](./agent-editor-folders-duplication-map.md).

---

## 5. Where to edit (common tasks)

| I want to…                                | Edit here (SSOT)                                                                                                                                                   | Do not edit                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Change TypeScript / JS style              | `.agents/rules/coding/*.mdc`                                                                                                                                       | `.cursor/rules/coding/` (symlink)               |
| Change OT / GitHub / Ralph rules          | `.agents/rules/commands/*.mdc`                                                                                                                                     | `.cursor/rules/commands/` (symlink)             |
| Add or change a **skill**                 | `.agents/skills/<slug>/SKILL.md`                                                                                                                                   | `.cursor/skills/`, `.claude/skills/`, `skills/` |
| Add a **persona**                         | `.agents/personas/<id>.md` from `_template.md`                                                                                                                     | —                                               |
| Change **Ralph loop** behavior            | `.agents/skills/agents-ralph/SKILL.md`                                                                                                                             | — (`.cursor/skills/agents-ralph` is symlink)    |
| Change **Ralph CLI** flags / queue        | `.agents/skills/workflow-ralph/`, `tools/workflows/`                                                                                                               | —                                               |
| Configure **openthrottle-mcp** locally    | Copy `.cursor/mcp.json.example` → `.cursor/mcp.json` (full guide: [mcp-registration.md](../openthrottle/mcp-registration.md))                                      | —                                               |
| Add **Cursor hook** (e.g. format on edit) | `.cursor/hooks.json`, `.cursor/hooks/`                                                                                                                             | — (Cursor-only)                                 |
| Recreate editor symlinks after clone      | `bash scripts/link-agent-assets.sh` (or `ln -s` per [canonical layout §3](./agent-assets-canonical-layout.md#3-editor-views-symlinks-only--no-independent-bodies)) | —                                               |

---

## 6. Ralph prompt layers

| Profile               | SSOT file                                | Stable load path (symlink)             |
| --------------------- | ---------------------------------------- | -------------------------------------- |
| Full OT task loop     | `.agents/skills/agents-ralph/SKILL.md`   | `.cursor/skills/agents-ralph/SKILL.md` |
| Persona lens          | `.agents/personas/<id>.md`               | same                                   |
| CLI / queue reference | `.agents/skills/workflow-ralph/SKILL.md` | skill attach; not the loop body        |

See [ralph-design.md](../workflows/ralph-design.md) and [tools/workflows/README.md](../../tools/workflows/README.md).

---

## 7. Git tracking (summary)

| Tracked                                                                 | Ignored / local                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `.agents/skills/`, `.agents/rules/*.mdc`                                | —                                                                |
| `.cursor/skills`, `.claude/skills`, `skills/` (symlinks, mode `120000`) | —                                                                |
| `.cursor/rules/**/*.mdc` (symlinks; except generated `nx-rules.mdc`)    | `nx-rules.mdc`, `.cursor/mcp.json`, `.cursor/cli-config.json`    |
| `.cursor/hooks.json`, `worktrees.json`, `settings.json`                 | Claude `projects/`, `debug/`, `sessions/`, `settings.local.json` |
| `.cursor/mcp.json.example`, `.vscode/settings.json.default`             | `.vscode/settings.json`, `CLAUDE.local.md`                       |

Full per-path table: [inventory §11](./agent-editor-folders-inventory.md#11-git-tracking-summary).

---

## 8. How this doc relates to AGENTS.md and AGENT_INPUTS.md

| Document                                                  | Owns                                                                         | Does not own                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| **This doc**                                              | Folder layout, SSOT vs symlink views, where to edit                          | Rule/skill bodies, generator command examples |
| **[AGENTS.md](../../AGENTS.md)**                          | Nx guidelines, `.agents/skills` index, workflow-ralph CLI, pointers to rules | Per-editor folder inventory                   |
| **[AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md)** | Canonical rules list for agents, example commands, discoverability checklist | Physical folder tree or sync mechanics        |

When onboarding agents: point them at **AGENT_INPUTS.md** for _what to load_ and **this doc** for _where files live_. When changing behavior: edit **`.agents/rules/`** or **`.agents/skills/`**, not symlink views.

---

## 9. Drift watch list

1. **CI `check-agent-assets-ssot`** — fails on non-symlink copies in `.cursor/skills`, `.claude/skills`, `skills/`, or `.cursor/rules`.
2. **`.opencode/skills`** — manual copies (`agents-ralph`, `monitor-ci`) until plan 1.5 symlink parity.
3. **Thin `ot-*` vs thick `ot-plans`** — intentional; both under `.agents/skills/`.
4. **Windows clones** — require `git config core.symlinks true` or WSL; see [CONTRIBUTING.md](../../CONTRIBUTING.md) § Agent assets.

Details: [duplication map §10](./agent-editor-folders-duplication-map.md#10-drift-risks-watch-list).

---

## 10. Related documentation

| Doc                                                                                                               | Relevance                                 |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [agent-assets-canonical-layout.md](./agent-assets-canonical-layout.md)                                            | SSOT layout, symlink conventions, CI spec |
| [tools/workflows/README.md](../../tools/workflows/README.md)                                                      | Ralph CLI, prompt injection from OT       |
| [repo-skills-discovery-design.md](../../applications/openthrottle-developer/docs/repo-skills-discovery-design.md) | Developer app skill scanning              |
| [CONTRIBUTING.md](../../CONTRIBUTING.md)                                                                          | Human contributor guide                   |
