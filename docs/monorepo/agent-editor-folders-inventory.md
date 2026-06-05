# Agent and editor folders — inventory

**Plan-Id:** `a55015f4-1d17-4f79-9772-d3f4788f8cfc`  
**Task:** Inventory agent/editor folders and entry points (`f33eeefc-4ac7-4ab6-b60c-5ac8e870c585`)  
**Status:** Working document; downstream tasks will map duplication, ownership, and consolidate into a single reference.

This inventory enumerates agent- and editor-specific configuration locations in the OpenThrottle monorepo. For each location: **purpose**, **primary audience**, and **git tracking** (tracked, ignored, or local-only).

---

## 1. Top-level folder tree

```
repo root
├── AGENTS.md                          # Cross-editor agent entry (Nx, OT skills index, workflow CLI)
├── CLAUDE.md                          # Claude Code entry (includes @~/.claude/info.md)
├── .workflow-ralph.json.example       # Ralph CLI local defaults example
├── skills/                            # agentskills.io layout + symlinks into .agents/skills
├── .agents/
│   ├── personas/                      # Role personas (architect, product, …)
│   └── skills/                        # Repo skills (OT-specific, shadcn, workflow-ralph, …)
├── .cursor/
│   ├── rules/                         # Cursor rules (.mdc) — code style + commands
│   ├── skills/                        # Cursor-discoverable skills (ot-*, github-*, nx-*, Ralph)
│   ├── agents/                        # Cursor subagent definitions
│   ├── hooks/ + hooks.json            # afterFileEdit → format.sh
│   ├── mcp.json.example               # MCP server template (openthrottle-mcp)
│   ├── settings.json                  # Workspace VS Code/Cursor settings (tracked)
│   └── worktrees.json                 # Cursor worktree setup hook
├── .claude/
│   ├── settings.json                  # Claude Code permissions / MCP enablement
│   └── skills/                        # Claude Code skills (mirror of much of .cursor/skills)
├── .opencode/
│   ├── ocx.jsonc                      # OpenCode registry config
│   ├── commands/                      # OpenCode slash commands
│   ├── agents/                        # OpenCode agent definitions
│   ├── plugins/                       # OpenCode plugins (worktree, kdco-primitives)
│   └── skills/                        # Subset of nx/monitor-ci/Ralph skills
└── .vscode/
    ├── settings.json.default          # Committed VS Code defaults
    ├── extensions.json, launch.json, mcp.json
    └── settings.json                  # Ignored (local overrides)
```

---

## 2. Root entry points

| Path                                   | Purpose                                                                                                                                                                                     | Audience                                   | Git                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------- |
| `AGENTS.md`                            | Monorepo agent handbook: Nx guidelines, `@tools/generators` / **openthrottle-generators**, OT skills index (`.agents/skills/*`), workflow-ralph CLI, code-style pointer to `.cursor/rules/` | All agents (Cursor, Claude, Ralph, humans) | Tracked                |
| `CLAUDE.md`                            | Claude Code project instructions; defers to `AGENTS.md`, `MONOREPO.md`, `CONTRIBUTING.md`; points code style to `.cursor/rules/`                                                            | Claude Code                                | Tracked                |
| `CLAUDE.local.md`                      | Optional local Claude overrides                                                                                                                                                             | Claude Code (local)                        | Ignored (`.gitignore`) |
| `.workflow-ralph.json.example`         | Example Ralph CLI config (`backend`, `prompt: /agents-ralph`, iterations, spawn)                                                                                                            | Ralph / workflow-ralph                     | Tracked                |
| `docs/tools/templates/AGENT_INPUTS.md` | Spec for rules, example commands, discoverability (generator-first)                                                                                                                         | Agents, auditors                           | Tracked                |
| `docs/tools/templates/AGENT_USAGE.md`  | Authoritative `@tools/generators` usage                                                                                                                                                     | Agents                                     | Tracked                |
| `CONTRIBUTING.md`                      | Human contributor guide; points to `.cursor/rules/`                                                                                                                                         | Humans                                     | Tracked                |

---

## 3. `.cursor/` (Cursor IDE)

| Path                                             | Purpose                                                                      | Audience                                   | Git                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `.cursor/rules/README.md`                        | Single entry for rules layout; OT-only plans; generators-first               | Cursor, Ralph, humans                      | Tracked                                           |
| `.cursor/rules/coding/*.mdc`                     | TypeScript/JS style (14 files): exports, types, naming, JSDoc, etc.          | Cursor (always-applied when configured)    | Tracked                                           |
| `.cursor/rules/commands/*.mdc`                   | OT MCP, GitHub, Ralph/agents behavior                                        | Cursor                                     | Tracked                                           |
| `.cursor/rules/personal-general.mdc`             | UI/API patterns, testing conventions                                         | Cursor                                     | Tracked                                           |
| `.cursor/rules/personal-generators.mdc`          | Mandatory generator-first workflow                                           | Cursor                                     | Tracked                                           |
| `.cursor/rules/cursor-commands.mdc`              | PNPM, NX, React import style                                                 | Cursor                                     | Tracked                                           |
| `.cursor/rules/no-cursor-attribution.mdc`        | No Cursor attribution in output                                              | Cursor                                     | Tracked                                           |
| `.cursor/rules/nx-rules.mdc`                     | Nx Console–generated workspace rules                                         | Cursor                                     | Ignored (generated; listed in `.gitignore` twice) |
| `.cursor/skills/`                                | **24** skills — see §7                                                       | Cursor slash skills, Ralph `--prompt-file` | Tracked                                           |
| `.cursor/agents/ci-monitor-subagent.md`          | CI monitor subagent definition                                               | Cursor                                     | Tracked                                           |
| `.cursor/hooks.json` + `.cursor/hooks/format.sh` | Run formatter after file edit                                                | Cursor                                     | Tracked                                           |
| `.cursor/mcp.json.example`                       | Template for openthrottle-mcp (API_URL, auth token)                          | Cursor MCP setup                           | Tracked                                           |
| `.cursor/mcp.json`                               | Live MCP config (secrets)                                                    | Cursor (local)                             | Ignored (global + typical local)                  |
| `.cursor/settings.json`                          | Workspace editor settings (ESLint, NX_ISOLATE_PLUGINS, openthrottle API URL) | Cursor / VS Code                           | Tracked                                           |
| `.cursor/cli-config.json`                        | Cursor CLI local config                                                      | Cursor CLI (local)                         | Ignored                                           |
| `.cursor/worktrees.json`                         | Worktree cleanup + `setup_worktree.sh` hook                                  | Cursor worktrees                           | Tracked                                           |

**Ralph reference:** `tools/workflows/README.md` cites `.cursor/skills/agents-ralph/SKILL.md` as the Ralph prompt source of truth; default prompt profile `/agents-ralph`.

---

## 4. `.claude/` (Claude Code)

| Path                                                                           | Purpose                                                                   | Audience            | Git     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------- | ------- |
| `.claude/settings.json`                                                        | Permissions (e.g. deny `Read(./.env)`), MCP json servers, skill overrides | Claude Code         | Tracked |
| `.claude/settings.local.json`                                                  | Local Claude settings                                                     | Claude Code (local) | Ignored |
| `.claude/skills/`                                                              | **24** skills — same slug set as `.cursor/skills/` (see §7)               | Claude Code         | Tracked |
| `.claude/projects/`, `.claude/debug/`, `.claude/sessions/`, `.claude/backups/` | Session/debug artifacts                                                   | Claude Code (local) | Ignored |
| `.claude/worktrees`                                                            | Claude worktree metadata                                                  | Claude Code (local) | Ignored |
| `.claude.json`                                                                 | Claude Code global/project config (local)                                 | Claude Code (local) | Ignored |

**Note:** `CLAUDE.md` includes `@~/.claude/info.md` (user home, outside repo).

---

## 5. `.agents/` (repo-local agent skills and personas)

| Path                                            | Purpose                                                               | Audience                                                                        | Git     |
| ----------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------- |
| `.agents/skills/`                               | **18** skills — OT-specific and extended set (see §7)                 | Cursor (via AGENTS.md index), developer app discovery, workflow lifecycle hooks | Tracked |
| `.agents/personas/`                             | Role prompts: architect, growth, legal, product + README, `_template` | Multi-agent / persona workflows                                                 | Tracked |
| `.agents/skills/openthrottle/PRIORITIZATION.md` | OT prioritization notes (not a skill)                                 | Agents                                                                          | Tracked |

**Developer app:** `openthrottle-developer` discovers skills under `.agents/skills` and `.cursor/skills` (`discover-repo-skills.server.ts`).

**Workflow hooks:** Job-run lifecycle hooks accept repo-relative paths under `.agents/skills/` or `.cursor/skills/` (`tools/workflows/src/types/job-run-lifecycle-hooks.ts`).

---

## 6. `skills/` (repo root — agentskills.io layout)

| Path                                                                                                            | Purpose                                                                 | Audience                              | Git                |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- | ------------------ |
| `skills/README.md`                                                                                              | agentskills.io format pointer; lists generators, monorepo, openthrottle | Generic agent skill consumers         | Tracked            |
| `skills/generators/`, `skills/monorepo/`                                                                        | Legacy/template skill folders (assets, references)                      | Agents                                | Tracked            |
| `skills/openthrottle-folders/`                                                                                  | Monorepo folder layout skill + references                               | Agents                                | Tracked            |
| `skills/agents-ralph/`, `skills/agents-code-review/`, `skills/ot-*`                                             | **10** skill copies (may differ from `.cursor/skills` — see task 2)     | External agentskills.io tooling       | Tracked            |
| `skills/brag-sheet`, `git-commit`, `create-readme`, `grill-me`, `my-pull-requests`, `secret-scanning`, `shadcn` | **Symlinks** → `.agents/skills/<name>`                                  | agentskills.io discovery at repo root | Tracked (symlinks) |

---

## 7. `.opencode/` (OpenCode)

| Path                                      | Purpose                                                                                                                                | Audience | Git                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| `.opencode/ocx.jsonc`                     | OpenCode registry schema config                                                                                                        | OpenCode | Tracked                                  |
| `.opencode/package.json`                  | OpenCode plugin dependencies                                                                                                           | OpenCode | Tracked                                  |
| `.opencode/commands/monitor-ci.md`        | OpenCode command                                                                                                                       | OpenCode | Tracked                                  |
| `.opencode/agents/ci-monitor-subagent.md` | Parallels `.cursor/agents/ci-monitor-subagent.md`                                                                                      | OpenCode | Tracked                                  |
| `.opencode/plugins/`                      | worktree plugin, kdco-primitives                                                                                                       | OpenCode | Tracked                                  |
| `.opencode/skills/`                       | **9** skills (nx-_, monitor-ci, link-workspace-packages, agents-ralph, agents-code-review) — no ot-_, github-\*, or OT-specific skills | OpenCode | Tracked                                  |
| `.opencode/node_modules/`                 | Installed deps                                                                                                                         | Local    | Not tracked (under node_modules pattern) |

---

## 8. `.vscode/` (VS Code — shared with Cursor)

| Path                            | Purpose                                                                         | Audience                   | Git     |
| ------------------------------- | ------------------------------------------------------------------------------- | -------------------------- | ------- |
| `.vscode/settings.json.default` | Committed workspace defaults (spell words, ESLint, NX_ISOLATE_PLUGINS, API URL) | VS Code, Cursor (inherits) | Tracked |
| `.vscode/extensions.json`       | Recommended extensions                                                          | VS Code / Cursor           | Tracked |
| `.vscode/launch.json`           | Debug launch configs                                                            | VS Code / Cursor           | Tracked |
| `.vscode/mcp.json`              | VS Code MCP servers                                                             | VS Code / Cursor           | Tracked |
| `.vscode/settings.json`         | Local overrides                                                                 | Local                      | Ignored |

---

## 9. Skill slug inventory (by folder)

Counts are `SKILL.md` files under each tree (excluding symlinks counted at target).

| Slug                                                                  | `.cursor` | `.claude` | `.agents` |  `skills/`  | `.opencode` |
| --------------------------------------------------------------------- | :-------: | :-------: | :-------: | :---------: | :---------: |
| agents-code-review                                                    |     ✓     |     ✓     |     —     |      ✓      |      ✓      |
| agents-ralph                                                          |     ✓     |     ✓     |     —     | ✓ (differs) |      ✓      |
| github-\* (8 skills)                                                  |     ✓     |     ✓     |     —     |      —      |      —      |
| ot-\* (7 skills)                                                      |     ✓     |     ✓     |     —     |      ✓      |      —      |
| link-workspace-packages                                               |     ✓     |     ✓     |     ✓     |      —      |      ✓      |
| monitor-ci                                                            |     ✓     |     ✓     |     ✓     |      —      |      ✓      |
| nx-generate, nx-import, nx-plugins, nx-run-tasks, nx-workspace        |     ✓     |     ✓     |     ✓     |      —      |      ✓      |
| brag-sheet, create-readme, git-commit, grill-me, my-pull-requests     |     —     |     —     |     ✓     |   symlink   |      —      |
| openthrottle-generators, openthrottle-stack, ot-plans, workflow-ralph |     —     |     —     |     ✓     |      —      |      —      |
| secret-scanning, shadcn                                               |     —     |     —     |     ✓     |   symlink   |      —      |
| generators, monorepo, openthrottle-folders                            |     —     |     —     |     —     |      ✓      |      —      |

**Totals:** `.cursor` 24 · `.claude` 24 · `.agents` 18 · `skills/` 12 SKILL.md (+ 7 symlinks) · `.opencode` 9

---

## 10. Related docs and workflow references

| Path                                                                       | Relevance                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `tools/workflows/README.md`                                                | Ralph CLI; prompt file `.cursor/skills/agents-ralph/SKILL.md`; OT plan/task injection |
| `docs/workflows/ralph-design.md`                                           | Ralph architecture                                                                    |
| `docs/openthrottle/audit-docs-and-cursor-vscode.md`                        | Historical Cursor/VS Code + naming audit                                              |
| `applications/openthrottle-developer/docs/repo-skills-discovery-design.md` | Scans `.agents/skills`, `.cursor/skills` only                                         |
| `packages/openthrottle-mcp/docs/verification-environment.md`               | MCP env; references `~/.cursor/mcp.json`                                              |
| `scripts/bootstrap-service-account-credentials.ts`                         | Documents Cursor MCP env for openthrottle-mcp                                         |

---

## 11. Git tracking summary

| Category                                                                | Tracked in git                                   | Ignored / local                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| Rules (`.cursor/rules/*.mdc` except nx-rules)                           | Yes                                              | `nx-rules.mdc` (generated)                                |
| Skills (`.cursor`, `.claude`, `.agents`, `skills/`, `.opencode/skills`) | Yes                                              | —                                                         |
| Personas (`.agents/personas/`)                                          | Yes                                              | —                                                         |
| Hooks, worktrees, settings (`.cursor/settings.json`, `worktrees.json`)  | Yes                                              | `cli-config.json`, `mcp.json`                             |
| Claude session/debug                                                    | —                                                | `projects/`, `debug/`, `sessions/`, `settings.local.json` |
| VS Code                                                                 | `settings.json.default`, extensions, launch, mcp | `settings.json`                                           |
| MCP secrets                                                             | `mcp.json.example`                               | `mcp.json`, `cli-config.json`                             |

**No automated sync script** was found in `package.json` or `scripts/` for copying skills/rules between editor folders (manual duplication / symlinks at `skills/` root only).

---

## 12. Audiences quick reference

| Audience                   | Primary config locations                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **Cursor IDE**             | `.cursor/rules/`, `.cursor/skills/`, `.cursor/hooks.json`, `.cursor/mcp.json` (local), `AGENTS.md` |
| **Claude Code**            | `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/`                                            |
| **Ralph / workflow-ralph** | `.cursor/skills/agents-ralph/SKILL.md`, `.workflow-ralph.json`, OT MCP                             |
| **OpenCode**               | `.opencode/` (skills, commands, plugins, agents)                                                   |
| **Developer app (UI)**     | Discovers `.agents/skills`, `.cursor/skills` at runtime                                            |
| **Humans**                 | `CONTRIBUTING.md`, `.cursor/rules/README.md`, `docs/tools/templates/AGENT_INPUTS.md`               |
| **Generic agentskills.io** | `skills/` at repo root (symlinks + copies)                                                         |

---

_Next tasks (same plan): map shared/duplicated content, document canonical ownership, consolidate into a single contributor reference, and wire cross-links from `AGENTS.md`, `CLAUDE.md`, and `AGENT_INPUTS.md`._
