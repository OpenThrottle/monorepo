# Agent and editor folders — canonical ownership

**Plan-Id:** `a55015f4-1d17-4f79-9772-d3f4788f8cfc`
**Task:** Document editor-unique content and canonical ownership (`9217dfe7-eebb-4a43-85bf-a5fd2c73f71a`)
**Consolidated reference:** [agent-editor-folders.md](./agent-editor-folders.md) · **Companions:** [inventory](./agent-editor-folders-inventory.md) · [duplication map](./agent-editor-folders-duplication-map.md)

This document answers: **where is the single source of truth** for each agent/editor concern, and **what exists in only one editor tree** (not mirrored elsewhere). Use it when adding or changing rules, skills, personas, MCP config, hooks, or Ralph prompts.

---

## 1. Canonical ownership by concern

| Concern                                                | Canonical location                                                                                                                           | Consumers link here                                                                                                               | Do not duplicate                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Code style & structure**                             | [`.agents/rules/coding/`](../../.agents/rules/coding/)                                                                                       | `.cursor/rules/coding/` (symlink), `CLAUDE.md`, `CONTRIBUTING.md`                                                                 | Full rule bodies in skills or docs                                        |
| **Command behavior** (OT, GitHub, Ralph)               | [`.agents/rules/commands/`](../../.agents/rules/commands/)                                                                                   | `.cursor/rules/commands/` (symlink), `ot-*` skills, `.agents/skills/ot-plans`                                                     | OT/GitHub procedure text in multiple places                               |
| **Rules index & agent behavior**                       | [`.agents/rules/README.md`](../../.agents/rules/README.md)                                                                                   | `.cursor/rules/README.md` (symlink), `AGENTS.md`                                                                                  | Second rules README elsewhere                                             |
| **Generator-first workflow**                           | [`.agents/rules/personal-generators.mdc`](../../.agents/rules/personal-generators.mdc) + [AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md) | `.cursor/rules/personal-generators.mdc` (symlink), `AGENTS.md`, `.agents/skills/openthrottle-generators`                          | Generator steps in app code comments                                      |
| **Cross-editor agent handbook**                        | [`AGENTS.md`](../../AGENTS.md)                                                                                                               | `CLAUDE.md` (defers for shared facts)                                                                                             | Forking monorepo facts into Claude-only docs                              |
| **Claude Code project entry**                          | [`CLAUDE.md`](../../CLAUDE.md)                                                                                                               | —                                                                                                                                 | Replacing `AGENTS.md` with Claude-only copy                               |
| **All skills** (slash, deep, contributor)              | [`.agents/skills/<slug>/`](../../.agents/skills/)                                                                                            | `.cursor/skills/`, `.claude/skills/`, `skills/` (symlinks), Ralph, developer app                                                  | Independent copies in editor trees (CI fails)                             |
| **Thin OT slash entrypoints**                          | [`.agents/skills/ot-*/`](../../.agents/skills/)                                                                                              | Cursor `/ot/*` via `.cursor/skills/ot-*` symlink                                                                                  | Full MCP tool tables (use `ot-plans` + `openthrottle.mdc`)                |
| **Personas** (domain lens)                             | [`.agents/personas/`](../.agents/personas/)                                                                                                  | Ralph `--prompt-file`                                                                                                             | Persona bodies in code or skills                                          |
| **Ralph loop prompt**                                  | [`.agents/skills/agents-ralph/SKILL.md`](../../.agents/skills/agents-ralph/SKILL.md)                                                         | `.cursor/skills/agents-ralph/` (symlink); `workflow-ralph` default `/agents-ralph`                                                | Independent copies in `.opencode/skills` (plan 1.5)                       |
| **Ralph CLI & queue behavior**                         | [`.agents/skills/workflow-ralph/SKILL.md`](../.agents/skills/workflow-ralph/SKILL.md)                                                        | `AGENTS.md`, workflow docs                                                                                                        | Ralph loop body (that lives in `agents-ralph`)                            |
| **agentskills.io root discovery**                      | [`skills/`](../skills/) (symlinks + selective copies)                                                                                        | External agentskills.io tooling                                                                                                   | New standalone copies when symlink suffices                               |
| **Legacy agentskills layout**                          | [`skills/generators/`, `skills/monorepo/`, `skills/openthrottle-folders/`](../skills/)                                                       | agentskills.io consumers                                                                                                          | Moving into editor trees without plan                                     |
| **MCP server definition** (openthrottle-mcp)           | [`.cursor/mcp.json.example`](../.cursor/mcp.json.example) + [packages/openthrottle-mcp/](../../packages/openthrottle-mcp/)                   | Copy to local `.cursor/mcp.json`; [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) | Secrets in git                                                            |
| **MCP live config (secrets)**                          | Local only: `.cursor/mcp.json`, `~/.cursor/mcp.json`                                                                                         | —                                                                                                                                 | Tracked `mcp.json` with tokens                                            |
| **Ralph local defaults example**                       | [`.workflow-ralph.json.example`](../../.workflow-ralph.json.example)                                                                         | User `.workflow-ralph.json` (gitignored)                                                                                          | Committed personal Ralph config                                           |
| **Discoverability spec** (rules vs commands vs skills) | [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md)                                                                                        | Auditors, contributors                                                                                                            | Full folder layout ([agent-editor-folders.md](./agent-editor-folders.md)) |

---

## 2. Editor-unique content (exists in one tree only)

Content below has **no full duplicate** in another editor folder. Other tools **reference** these paths; they do not maintain parallel copies (except where noted as manual mirrors).

### 2.1 Cursor-only (`.cursor/`)

| Path                                                                                                    | Purpose                                                          | Why Cursor-only                                                                                    |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`.cursor/rules/*.mdc`](../.cursor/rules/) (symlinks → `.agents/rules/`)                                | Cursor rule activation paths                                     | Bodies in `.agents/rules/`; `.mdc` + Cursor rule engine                                            |
| [`.cursor/rules/nx-rules.mdc`](../.cursor/rules/nx-rules.mdc)                                           | Nx Console–generated workspace rules                             | Generated; gitignored                                                                              |
| [`.cursor/hooks.json`](../.cursor/hooks.json) + [`.cursor/hooks/format.sh`](../.cursor/hooks/format.sh) | Run formatter after agent file edits                             | Cursor hooks API                                                                                   |
| [`.cursor/worktrees.json`](../.cursor/worktrees.json)                                                   | Worktree cleanup + `setup_worktree.sh`                           | Cursor worktree integration                                                                        |
| [`.cursor/agents/ci-monitor-subagent.md`](../.cursor/agents/ci-monitor-subagent.md)                     | Cursor subagent definition                                       | Cursor agent frontmatter (`name`, `model`)                                                         |
| [`.cursor/mcp.json.example`](../.cursor/mcp.json.example)                                               | Committed MCP template for openthrottle-mcp                      | Cursor MCP config path; VS Code uses `.vscode/mcp.json` separately                                 |
| [`.cursor/settings.json`](../.cursor/settings.json)                                                     | Tracked workspace settings (ESLint, NX_ISOLATE_PLUGINS, API URL) | Cursor-specific workspace file (overlaps `.vscode/settings.json.default` keys, not identical file) |
| **`github-*` skills (8)** under [`.cursor/skills/`](../.cursor/skills/)                                 | Cursor slash commands for GitHub workflow                        | Not in `.agents`, `skills/`, or `.opencode`                                                        |

### 2.2 Claude Code-only (`.claude/` + root)

| Path                                                                                          | Purpose                                                                 | Why Claude-only             |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------- |
| [`CLAUDE.md`](../../CLAUDE.md)                                                                | Claude Code project instructions; includes `@~/.claude/info.md`         | Claude Code entry contract  |
| [`CLAUDE.local.md`](../../CLAUDE.local.md)                                                    | Optional local overrides                                                | Gitignored; Claude local    |
| [`.claude/settings.json`](../.claude/settings.json)                                           | Permissions (e.g. deny `Read(./.env)`), MCP enablement, skill overrides | Claude Code settings schema |
| [`.claude/settings.local.json`](../.claude/settings.local.json)                               | Local Claude settings                                                   | Gitignored                  |
| [`.claude/projects/`, `.claude/debug/`, `.claude/sessions/`, `.claude/backups/`](../.claude/) | Session and debug artifacts                                             | Local runtime; gitignored   |
| [`.claude.json`](../.claude.json) (repo root, if present)                                     | Claude Code project config                                              | Gitignored                  |

**Note:** [`.claude/skills/`](../.claude/skills/) is **not** Claude-unique — symlinks to [`.agents/skills/`](../../.agents/skills/). Edit `.agents/skills/` only.

### 2.3 Repo-local agent content (`.agents/` — not under a specific IDE)

| Path                                                                                                | Purpose                                             | Why only here                                                                                    |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`.agents/personas/`](../.agents/personas/)                                                         | Role prompts (architect, product, legal, growth, …) | Single persona tree; Ralph `--prompt-file`; see [personas README](../.agents/personas/README.md) |
| [`.agents/skills/openthrottle-generators`](../.agents/skills/openthrottle-generators/)              | OT generator discovery skill                        | Indexed in `AGENTS.md`; not Cursor slash skill                                                   |
| [`.agents/skills/openthrottle-stack`](../.agents/skills/openthrottle-stack/)                        | Server, DB, developer UI, MCP package slice         | Deep OT platform skill                                                                           |
| [`.agents/skills/ot-plans`](../.agents/skills/ot-plans/)                                            | Full OT plan/task lifecycle (MCP tables)            | Complements thin `.cursor/skills/ot-*` wrappers                                                  |
| [`.agents/skills/workflow-ralph`](../.agents/skills/workflow-ralph/)                                | Ralph CLI, queue, commit cadence                    | Complements `.cursor/skills/agents-ralph` (loop prompt)                                          |
| [`.agents/skills/brag-sheet`, `git-commit`, `create-readme`, …](../.agents/skills/)                 | Contributor workflows                               | Exposed at repo root via [symlinks in `skills/`](../skills/)                                     |
| [`.agents/skills/openthrottle/PRIORITIZATION.md`](../.agents/skills/openthrottle/PRIORITIZATION.md) | OT prioritization notes                             | Not a skill; supporting doc                                                                      |

Developer app **discovers** `.agents/skills` and `.cursor/skills` only — not `.claude/skills` or `skills/`.

### 2.4 OpenCode-only (`.opencode/`)

| Path                                                                                    | Purpose                                                                              | Why OpenCode-only                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [`.opencode/ocx.jsonc`](../.opencode/ocx.jsonc)                                         | OpenCode registry config                                                             | OpenCode schema                                                 |
| [`.opencode/package.json`](../.opencode/package.json)                                   | OpenCode plugin dependencies                                                         | OpenCode runtime                                                |
| [`.opencode/commands/`](../.opencode/commands/)                                         | OpenCode slash commands (e.g. `monitor-ci.md`)                                       | OpenCode command format                                         |
| [`.opencode/plugins/`](../.opencode/plugins/)                                           | worktree plugin, kdco-primitives                                                     | OpenCode plugin API                                             |
| [`.opencode/agents/ci-monitor-subagent.md`](../.opencode/agents/ci-monitor-subagent.md) | OpenCode subagent (`mode: subagent`)                                                 | Near-duplicate of `.cursor/agents`; editor-specific frontmatter |
| [`.opencode/skills/`](../.opencode/skills/) (9 slugs)                                   | Subset: nx-\*, monitor-ci, link-workspace-packages, agents-ralph, agents-code-review | No `ot-*`, `github-*`, or OT stack skills                       |

### 2.5 Repo-root `skills/` (agentskills.io — not IDE-specific)

| Path                                                                                   | Purpose                                      | Why only here                                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`skills/generators/`, `skills/monorepo/`, `skills/openthrottle-folders/`](../skills/) | Legacy agentskills.io folder layout          | Not in `.cursor` / `.claude` / `.agents` skill trees                                            |
| [`skills/` symlinks](../skills/) → `.agents/skills/*`                                  | Root-level discovery for agentskills.io      | Canonical body in `.agents/skills`                                                              |
| [`skills/ot-*`, `skills/agents-code-review`](../skills/) (copies)                      | External consumer copies of `.cursor` skills | Manual copy; keep in sync or prefer symlink for new skills                                      |
| [`skills/agents-ralph`](../skills/agents-ralph/) (copy)                                | External Ralph prompt                        | **Drifts** from canonical `.cursor/skills/agents-ralph` (`disable-model-invocation`, echo path) |

### 2.6 VS Code shared (not Cursor-exclusive, but separate from `.cursor/`)

| Path                                                                | Purpose                    | Notes                                                |
| ------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| [`.vscode/settings.json.default`](../.vscode/settings.json.default) | Committed VS Code defaults | Cursor inherits; parallel to `.cursor/settings.json` |
| [`.vscode/extensions.json`](../.vscode/extensions.json)             | Recommended extensions     | Shared                                               |
| [`.vscode/launch.json`](../.vscode/launch.json)                     | Debug configs              | Shared                                               |
| [`.vscode/mcp.json`](../.vscode/mcp.json)                           | VS Code MCP servers        | Currently empty `{}`; parallel to Cursor MCP         |

---

## 3. Ralph prompt paths (layer 1)

Ralph uses a **three-layer** model (prompt → backend → run tuning). Only layer-1 prompt files are listed here.

| Profile               | Canonical file                           | Default invocation                                                                         | Notes                                                                  |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **Full OT task loop** | `.agents/skills/agents-ralph/SKILL.md`   | `--prompt /agents-ralph` or `--prompt-file .cursor/skills/agents-ralph/SKILL.md` (symlink) | SSOT in `.agents/`; stable Ralph CLI path via `.cursor/skills/`        |
| **Persona lens**      | `.agents/personas/<id>.md`               | `--prompt-file .agents/personas/architect.md`                                              | Steers tone; does not replace OT loop unless intentionally substituted |
| **CLI / queue docs**  | `.agents/skills/workflow-ralph/SKILL.md` | Skill attach / `AGENTS.md` index                                                           | Documents bins, env, hooks — not the loop prompt body                  |

**Non-canonical copies:** `skills/agents-ralph/` and `.opencode/skills/agents-ralph/` — update when external consumers must match; Ralph CLI resolves `.cursor` path by default.

---

## 4. MCP configuration ownership

| Layer                     | Location                                          | Tracked?             | Role                                                                              |
| ------------------------- | ------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| **Server package & docs** | `packages/openthrottle-mcp/`                      | Yes                  | GraphQL-only MCP implementation                                                   |
| **Committed template**    | `.cursor/mcp.json.example`                        | Yes                  | Copy to local `.cursor/mcp.json`; env vars documented in package verification doc |
| **Live Cursor config**    | `.cursor/mcp.json` or `~/.cursor/mcp.json`        | No (secrets)         | `OPENTHROTTLE_MCP_AUTH_TOKEN`, `API_URL`                                          |
| **VS Code MCP**           | `.vscode/mcp.json`                                | Yes (empty template) | Separate from Cursor path                                                         |
| **Claude MCP enablement** | `.claude/settings.json` → `enabledMcpjsonServers` | Yes                  | Claude-specific; does not replace openthrottle-mcp wiring                         |

**Rule:** Never commit tokens. Bootstrap scripts (e.g. `scripts/bootstrap-service-account-credentials.ts`) document how to populate local MCP config.

---

## 5. Where to edit (quick reference)

| I want to…                                 | Edit canonical location                                      | Also update (manual)                                            |
| ------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Change TypeScript style                    | `.agents/rules/coding/*.mdc`                                 | — (`.cursor/rules/` is symlink)                                 |
| Change OT/GitHub/Ralph command rules       | `.agents/rules/commands/*.mdc`                               | Thin `ot-*` skills if triggers change                           |
| Add any skill (slash or deep)              | `.agents/skills/<slug>/SKILL.md`                             | Add symlinks in `.cursor/skills/`, `.claude/skills/`, `skills/` |
| Add persona                                | `.agents/personas/<id>.md` from `_template.md`               | —                                                               |
| Change Ralph loop behavior                 | `.agents/skills/agents-ralph/SKILL.md`                       | `.cursor/skills/agents-ralph` symlink                           |
| Change Ralph CLI flags / queue             | `.agents/skills/workflow-ralph/SKILL.md`, `tools/workflows/` | Workflow README                                                 |
| Expose skill at repo root (agentskills.io) | Symlink `skills/<slug>` → `.agents/skills/<slug>`            | Prefer symlink over copy                                        |
| Configure openthrottle-mcp locally         | Copy `.cursor/mcp.json.example` → `.cursor/mcp.json`         | —                                                               |
| Add OpenCode command/skill                 | `.opencode/commands/` or `.opencode/skills/`                 | No automatic sync to Cursor                                     |

---

## 6. Intentional splits (not duplication errors)

These pairs look like overlap but serve different roles:

| Thin / entry                            | Thick / canonical                                                     | Relationship                                                       |
| --------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `.agents/skills/ot-*` (7)               | `.agents/rules/commands/openthrottle.mdc` + `.agents/skills/ot-plans` | Slash skills defer to rules; `ot-plans` holds MCP lifecycle detail |
| `.cursor/skills/agents-ralph`           | `.agents/skills/workflow-ralph`                                       | Loop prompt vs CLI/queue documentation                             |
| `AGENTS.md`                             | `CLAUDE.md`                                                           | Cross-editor handbook vs Claude Code entry (link, don’t fork)      |
| `.cursor/agents/ci-monitor-subagent.md` | `.opencode/agents/ci-monitor-subagent.md`                             | Same role; editor-specific agent format                            |
| `.cursor/settings.json`                 | `.vscode/settings.json.default`                                       | Overlapping keys; separate files for IDE merge behavior            |

---

## 7. Related documentation

| Doc                                                                                                               | Scope                                       |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [agent-editor-folders.md](./agent-editor-folders.md)                                                              | Contributor entry point (this plan)         |
| [agent-editor-folders-inventory.md](./agent-editor-folders-inventory.md)                                          | Full folder tree, audiences, git tracking   |
| [agent-editor-folders-duplication-map.md](./agent-editor-folders-duplication-map.md)                              | Exact vs near duplicates, drift watch list  |
| [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md)                                                             | Rules vs commands vs skills discoverability |
| [ralph-design.md](../workflows/ralph-design.md)                                                                   | Ralph architecture and OT injection         |
| [repo-skills-discovery-design.md](../../applications/openthrottle-developer/docs/repo-skills-discovery-design.md) | Developer app skill scanning                |
