# Agent and editor folders — contributor reference

**Plan-Id:** `a55015f4-1d17-4f79-9772-d3f4788f8cfc`

Single entry point for **where agent- and editor-specific config lives** in the OpenThrottle monorepo: folder layout, duplication strategy, canonical ownership, and where to edit for common tasks.

**Deep dives (same plan, linked — not duplicated here):**

| Document                                                                             | Scope                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [agent-editor-folders-inventory.md](./agent-editor-folders-inventory.md)             | Full tree, per-path purpose, audiences, git tracking         |
| [agent-editor-folders-duplication-map.md](./agent-editor-folders-duplication-map.md) | Exact vs near duplicates, sync mechanisms, drift watch list  |
| [agent-editor-folders-ownership.md](./agent-editor-folders-ownership.md)             | Canonical source of truth per concern, editor-unique content |

**Related entry points (different concerns — link, don’t fork):**

| Document                                                 | Scope                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [AGENTS.md](../../AGENTS.md)                             | Cross-editor handbook: Nx, OT skills index, workflow-ralph CLI, code-style pointer |
| [CLAUDE.md](../../CLAUDE.md)                             | Claude Code project entry; defers shared facts to `AGENTS.md`                      |
| [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md)    | What agents should load: rules list, example commands, discoverability spec        |
| [AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)      | Authoritative `@tools/generators` usage                                            |
| [.cursor/rules/README.md](../../.cursor/rules/README.md) | Rules layout, agent behavior (OT-only plans, generators first)                     |

---

## 1. Folder tree (overview)

```
repo root
├── AGENTS.md, CLAUDE.md              # Cross-editor entry points
├── .workflow-ralph.json.example      # Ralph CLI local defaults (example)
├── skills/                           # agentskills.io layout: symlinks + copies
├── .agents/
│   ├── personas/                     # Role prompts (architect, product, …)
│   └── skills/                       # OT deep skills, contributor workflows
├── .cursor/
│   ├── rules/                        # Canonical code style + command rules (.mdc)
│   ├── skills/                       # Cursor slash skills (ot-*, github-*, nx, Ralph)
│   ├── agents/                       # Cursor subagent definitions
│   ├── hooks/ + hooks.json           # afterFileEdit → format.sh
│   ├── mcp.json.example              # openthrottle-mcp template
│   ├── settings.json, worktrees.json
├── .claude/
│   ├── settings.json                 # Permissions, MCP enablement
│   └── skills/                       # Mirror of .cursor/skills (24 slugs)
├── .opencode/
│   ├── ocx.jsonc, commands/, plugins/
│   ├── agents/, skills/              # Subset (9 slugs); no ot-*, github-*
└── .vscode/
    ├── settings.json.default, extensions.json, launch.json, mcp.json
```

**Skill counts (`SKILL.md` files):** `.cursor` 24 · `.claude` 24 · `.agents` 18 · `skills/` 12 (+ 7 symlinks) · `.opencode` 9

**Developer app discovery:** `openthrottle-developer` scans **only** `.agents/skills` and `.cursor/skills` — not `.claude`, `skills/`, or `.opencode`.

---

## 2. Audiences and primary locations

| Audience                   | Primary config                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------- |
| **Cursor IDE**             | `.cursor/rules/`, `.cursor/skills/`, `.cursor/hooks.json`, local `.cursor/mcp.json` |
| **Claude Code**            | `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/`                             |
| **Ralph / workflow-ralph** | `.cursor/skills/agents-ralph/SKILL.md`, `.workflow-ralph.json`, OT MCP              |
| **OpenCode**               | `.opencode/` (skills, commands, plugins, agents)                                    |
| **Generic agentskills.io** | Repo-root `skills/` (symlinks + copies)                                             |
| **Humans**                 | `CONTRIBUTING.md`, `.cursor/rules/README.md`, this doc                              |

---

## 3. Canonical ownership (summary)

Edit the **canonical** location first; sync manually where noted.

| Concern                                               | Canonical location                                                                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Code style                                            | [`.cursor/rules/coding/`](../../.cursor/rules/coding/)                                                                                       |
| OT / GitHub / Ralph command behavior                  | [`.cursor/rules/commands/`](../../.cursor/rules/commands/)                                                                                   |
| Generator-first workflow                              | [`.cursor/rules/personal-generators.mdc`](../../.cursor/rules/personal-generators.mdc) + [AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md) |
| Cross-editor handbook                                 | [`AGENTS.md`](../../AGENTS.md)                                                                                                               |
| Claude Code entry                                     | [`CLAUDE.md`](../../CLAUDE.md)                                                                                                               |
| Cursor slash skills (`/ot/*`, `/github/*`, nx, Ralph) | [`.cursor/skills/<slug>/`](../../.cursor/skills/)                                                                                            |
| Claude skill parity (24 shared slugs)                 | [`.claude/skills/`](../../.claude/skills/) — edit `.cursor` first, then copy                                                                 |
| OT deep skills (plans, stack, generators, Ralph CLI)  | [`.agents/skills/`](../../.agents/skills/)                                                                                                   |
| Personas                                              | [`.agents/personas/`](../../.agents/personas/)                                                                                               |
| Ralph loop prompt                                     | [`.cursor/skills/agents-ralph/SKILL.md`](../../.cursor/skills/agents-ralph/SKILL.md)                                                         |
| Ralph CLI / queue docs                                | [`.agents/skills/workflow-ralph/SKILL.md`](../../.agents/skills/workflow-ralph/SKILL.md)                                                     |
| agentskills.io root discovery                         | [`skills/`](../../skills/) — prefer symlinks to `.agents/skills`                                                                             |
| MCP template (openthrottle-mcp)                       | [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example) + [packages/openthrottle-mcp/](../../packages/openthrottle-mcp/)                |
| MCP secrets                                           | Local only: `.cursor/mcp.json`, `~/.cursor/mcp.json`                                                                                         |

Full table and editor-unique paths: [ownership doc](./agent-editor-folders-ownership.md).

---

## 4. Duplication matrix (summary)

**Sync today:** manual copy and symlinks only — **no automated sync script** in `package.json` or `scripts/`.

| Relationship                     | Locations                                                                                         | Notes                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Exact duplicate**              | `.cursor/skills` ↔ `.claude/skills` (24 slugs)                                                    | Byte-identical today; keep in lockstep                              |
| **Exact duplicate**              | `.cursor` ↔ `skills/` for 8 slugs (`ot-*`, `agents-code-review`)                                  | Manual copy                                                         |
| **Exact duplicate**              | `.cursor` ↔ `.agents` for 6 nx slugs                                                              | `link-workspace-packages`, `nx-*`                                   |
| **Near-duplicate (drift)**       | `agents-ralph` in `.cursor`, `skills/`, `.opencode`                                               | `disable-model-invocation`, echo path differ — Ralph uses `.cursor` |
| **Near-duplicate (drift)**       | `monitor-ci` in `.cursor`, `.agents`, `.opencode`                                                 | Poll threshold, `$ARGUMENTS` parsing differ                         |
| **Cursor-only**                  | `github-*` (8 skills), `.cursor/rules/*.mdc`, hooks, worktrees                                    | Not mirrored elsewhere                                              |
| **`.agents`-only**               | `ot-plans`, `openthrottle-stack`, `openthrottle-generators`, `workflow-ralph`, contributor skills | Indexed in `AGENTS.md`                                              |
| **Intentional thin/thick split** | `.cursor/skills/ot-*` → rules + `.agents/skills/ot-plans`                                         | Slash entrypoints vs full MCP lifecycle                             |
| **Symlinks**                     | `skills/{brag-sheet,git-commit,…}` → `.agents/skills/*`                                           | 7 symlinks; canonical body in `.agents`                             |

Full matrix and drift watch list: [duplication map](./agent-editor-folders-duplication-map.md).

---

## 5. Where to edit (common tasks)

| I want to…                                                    | Edit here                                             | Also update (manual)                                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Change TypeScript / JS style                                  | `.cursor/rules/coding/*.mdc`                          | — (others link in)                                                                                  |
| Change OT / GitHub / Ralph rules                              | `.cursor/rules/commands/*.mdc`                        | Thin `ot-*` skills if triggers change                                                               |
| Add a **Cursor slash skill** (`/ot/*`, `/github/*`)           | `.cursor/skills/<slug>/SKILL.md`                      | `.claude/skills/<slug>/` for parity                                                                 |
| Add a **deep OT / workflow skill**                            | `.agents/skills/<slug>/`                              | `AGENTS.md` index; optional `skills/` symlink                                                       |
| Add a **persona**                                             | `.agents/personas/<id>.md` from `_template.md`        | —                                                                                                   |
| Change **Ralph loop** behavior                                | `.cursor/skills/agents-ralph/SKILL.md`                | `skills/`, `.opencode` copies if external consumers need parity                                     |
| Change **Ralph CLI** flags / queue                            | `.agents/skills/workflow-ralph/`, `tools/workflows/`  | [tools/workflows/README.md](../../tools/workflows/README.md)                                        |
| Expose skill at repo root (agentskills.io)                    | Symlink `skills/<slug>` → `.agents/skills/<slug>`     | Prefer symlink over copy                                                                            |
| Configure **openthrottle-mcp** locally                        | Copy `.cursor/mcp.json.example` → `.cursor/mcp.json`  | See [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) |
| Add **OpenCode** command or skill                             | `.opencode/commands/` or `.opencode/skills/`          | No automatic sync to Cursor                                                                         |
| Add **Cursor hook** (e.g. format on edit)                     | `.cursor/hooks.json`, `.cursor/hooks/`                | Cursor-only                                                                                         |
| Change **discoverability spec** (rules vs commands vs skills) | [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md) | Not folder layout (use this doc)                                                                    |

---

## 6. Ralph prompt layers

Ralph uses prompt → backend → run tuning. Prompt files only:

| Profile               | File                                     | Invocation                                    |
| --------------------- | ---------------------------------------- | --------------------------------------------- |
| Full OT task loop     | `.cursor/skills/agents-ralph/SKILL.md`   | `--prompt /agents-ralph` (default)            |
| Persona lens          | `.agents/personas/<id>.md`               | `--prompt-file .agents/personas/architect.md` |
| CLI / queue reference | `.agents/skills/workflow-ralph/SKILL.md` | Skill attach; not the loop body               |

See [ralph-design.md](../workflows/ralph-design.md) and [tools/workflows/README.md](../../tools/workflows/README.md).

---

## 7. Git tracking (summary)

| Tracked                                                                       | Ignored / local                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `.cursor/rules/*.mdc` (except generated `nx-rules.mdc`)                       | `nx-rules.mdc`, `.cursor/mcp.json`, `.cursor/cli-config.json`    |
| `.cursor/skills`, `.claude/skills`, `.agents/`, `skills/`, `.opencode/skills` | —                                                                |
| `.cursor/hooks.json`, `worktrees.json`, `settings.json`                       | Claude `projects/`, `debug/`, `sessions/`, `settings.local.json` |
| `.cursor/mcp.json.example`, `.vscode/settings.json.default`                   | `.vscode/settings.json`, `CLAUDE.local.md`                       |

Full per-path table: [inventory §11](./agent-editor-folders-inventory.md#11-git-tracking-summary).

---

## 8. How this doc relates to AGENTS.md and AGENT_INPUTS.md

| Document                                                  | Owns                                                                                    | Does not own                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| **This doc**                                              | Folder layout, duplication strategy, canonical paths, where to edit                     | Rule/skill bodies, generator command examples |
| **[AGENTS.md](../../AGENTS.md)**                          | Nx guidelines, `.agents/skills` index, workflow-ralph CLI, pointers to `.cursor/rules/` | Per-editor folder inventory                   |
| **[AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md)** | Canonical rules list for agents, example commands, discoverability checklist            | Physical folder tree or sync mechanics        |

When onboarding agents: point them at **AGENT_INPUTS.md** for _what to load_ and **this doc** for _where files live_. When changing behavior: edit **`.cursor/rules/`** or the canonical skill path in §5, not a duplicate tree.

---

## 9. Drift watch list

1. **`.cursor` / `.claude`** — 24 skills identical today; any edit to shared slugs should touch both until automation exists.
2. **`agents-ralph`** — three variants; Ralph CLI uses `.cursor` path.
3. **`monitor-ci`** — behavioral differences across three trees; highest risk for CI automation.
4. **Thin `ot-*` vs thick `ot-plans`** — intentional; avoid merging without updating slash commands and `AGENTS.md`.

Details: [duplication map §10](./agent-editor-folders-duplication-map.md#10-drift-risks-watch-list).

---

## 10. Related documentation

| Doc                                                                                                               | Relevance                           |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| [tools/workflows/README.md](../../tools/workflows/README.md)                                                      | Ralph CLI, prompt injection from OT |
| [repo-skills-discovery-design.md](../../applications/openthrottle-developer/docs/repo-skills-discovery-design.md) | Developer app skill scanning        |
| [audit-docs-and-cursor-vscode.md](../openthrottle/audit-docs-and-cursor-vscode.md)                                | Historical Cursor/VS Code audit     |
| [CONTRIBUTING.md](../../CONTRIBUTING.md)                                                                          | Human contributor guide             |
