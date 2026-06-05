# Agent and editor folders — duplication map

**Plan-Id:** `a55015f4-1d17-4f79-9772-d3f4788f8cfc`  
**Task:** Map shared and duplicated content across editors (`a9026517-d683-40ab-acae-a4e6d28bee85`)  
**Companion:** [agent-editor-folders-inventory.md](./agent-editor-folders-inventory.md) (folder inventory)

This document compares content across `.cursor/`, `.claude/`, `.agents/`, repo-root `skills/`, and `.opencode/`. It classifies **exact duplicates**, **near-duplicates** (same slug, different path or drift), and **editor-only** content. It also records **sync mechanisms** (or lack thereof).

---

## 1. Sync mechanisms summary

| Mechanism                | What it covers                                                  | Notes                                                                               |
| ------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Manual copy**          | `.cursor/skills` ↔ `.claude/skills` (24 slugs)                  | Byte-identical today; no script enforces parity                                     |
| **Manual copy**          | `.cursor/skills` → `skills/` (10 skill folders)                 | `ot-*` (7) and `agents-code-review` match `.cursor`; `agents-ralph` drifts          |
| **Manual copy**          | Shared nx/monitor skills → `.agents/skills`, `.opencode/skills` | Most nx-\* identical to `.cursor`; `monitor-ci` drifts in `.agents` and `.opencode` |
| **Symlinks**             | `skills/{brag-sheet,git-commit,…}` → `.agents/skills/<name>`    | 7 symlinks; canonical body lives in `.agents/skills`                                |
| **Cross-reference only** | Rules, OT stack skills, personas                                | No duplicate tree — pointers from `AGENTS.md`, `CLAUDE.md`, personas                |
| **None**                 | `.cursor/rules/*.mdc`                                           | Cursor-only format; Claude/others reference `.cursor/rules/` as canonical           |

**No automated sync script** exists in `package.json` or `scripts/` for editor folders. `pnpm sync:openthrottle:*` is unrelated (git subtree pushes for applications).

---

## 2. Skills duplication matrix

### 2.1 Exact duplicates (byte-identical `SKILL.md` and supporting files)

| Pair                                  | Slugs                                                                                                                                      | Count                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `.cursor/skills` ↔ `.claude/skills`   | All 24 slugs                                                                                                                               | 24 — full trees match (`diff -rq` clean) |
| `.cursor/skills` ↔ `.agents/skills`   | `link-workspace-packages`, `nx-generate`, `nx-import`, `nx-plugins`, `nx-run-tasks`, `nx-workspace`                                        | 6                                        |
| `.cursor/skills` ↔ `skills/`          | `ot-ask`, `ot-create-plan`, `ot-edit-task`, `ot-list-by-status`, `ot-list-sources`, `ot-pending`, `ot-planning-mode`, `agents-code-review` | 8                                        |
| `.cursor/skills` ↔ `.opencode/skills` | `agents-code-review`, `link-workspace-packages`, `nx-generate`, `nx-import`, `nx-plugins`, `nx-run-tasks`, `nx-workspace`                  | 7                                        |

### 2.2 Near-duplicates (same concern, drift or path-specific metadata)

| Slug             | Locations                                               | Drift                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **agents-ralph** | `.cursor` (canonical for Ralph), `skills/`, `.opencode` | `disable-model-invocation`: `false` in `.cursor`, `true` in `skills/` and `.opencode`. Startup echo path differs (`.cursor/skills/agents-ralph` vs `skills/agents-ralph`). Body otherwise aligned. |
| **monitor-ci**   | `.cursor`, `.agents`, `.opencode`                       | `.agents` and `.opencode` have richer `description`, `$ARGUMENTS` parsing, `circuit_breaker` threshold 13 vs 5 in `.cursor`. `ci-poll-decide.mjs` differs between `.cursor` and `.agents`.         |

### 2.3 Same skill, different path (no duplicate in other editor trees)

| Slug                                                                                                                   | Canonical location                            | Also appears as        | Notes                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| **github-\*** (8)                                                                                                      | `.cursor/skills`, `.claude/skills`            | —                      | Cursor slash + Claude only; not in `.agents`, `skills/`, or `.opencode`               |
| **ot-\*** (7)                                                                                                          | `.cursor/skills`, `.claude/skills`, `skills/` | —                      | Thin wrappers → `.cursor/rules/commands/openthrottle.mdc`; not in `.agents` as `ot-*` |
| **ot-plans**                                                                                                           | `.agents/skills` only                         | —                      | Deep OT lifecycle skill; complements thin `ot-*` slash skills                         |
| **openthrottle-generators**, **openthrottle-stack**, **workflow-ralph**                                                | `.agents/skills` only                         | Indexed in `AGENTS.md` | OT-specific; not mirrored under `.cursor` or `.claude`                                |
| **brag-sheet**, **create-readme**, **git-commit**, **grill-me**, **my-pull-requests**, **secret-scanning**, **shadcn** | `.agents/skills`                              | `skills/` symlinks     | Cursor discovers via user-global skills or `AGENTS.md`; not under `.cursor/skills`    |
| **generators**, **monorepo**, **openthrottle-folders**                                                                 | `skills/` only                                | —                      | Legacy agentskills.io layout; not in editor skill trees                               |

### 2.4 Slug coverage by folder

```
                    .cursor  .claude  .agents  skills/  .opencode
github-* (8)           ✓        ✓        —        —         —
ot-* slash (7)         ✓        ✓        —    copies(7)     —
agents-ralph           ✓        ✓        —    copy*         copy*
agents-code-review     ✓        ✓        —        ✓         ✓
nx-* + link + monitor  ✓        ✓    partial†   —      partial†
OT stack (3)           —        —        ✓        —         —
Persona-adjacent (7)   —        —        ✓    symlink(7)    —
Legacy (3)             —        —        —        ✓         —

† monitor-ci drifts; other shared nx slugs match .cursor
* agents-ralph drifts in skills/ and .opencode
```

---

## 3. Rules and command behavior

| Content                       | Location                  | Duplicated elsewhere?                                                      |
| ----------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| Code style (14 `.mdc`)        | `.cursor/rules/coding/`   | **No** — Claude (`CLAUDE.md`), `CONTRIBUTING.md`, personas link here       |
| OT / GitHub / agents commands | `.cursor/rules/commands/` | **No** — `ot-*` skills and `.agents/skills/ot-plans` reference these paths |
| Personal / generators / nx    | `.cursor/rules/*.mdc`     | **No** — `nx-rules.mdc` is generated (gitignored)                          |
| Rules README                  | `.cursor/rules/README.md` | **No** — states single source of truth                                     |

**Near-duplicate pattern:** `ot-ask`, `ot-create-plan`, etc. are **thin skill entrypoints** that defer to `openthrottle.mdc`. `.agents/skills/ot-plans` is a **thick skill** covering the same domain with MCP tool tables and lifecycle — complementary, not byte-duplicated.

---

## 4. Personas

| Content                           | Location            | Duplicated?                |
| --------------------------------- | ------------------- | -------------------------- |
| architect, growth, legal, product | `.agents/personas/` | **No** — only tree in repo |
| `_template.md`, README            | `.agents/personas/` | **No**                     |

Personas **link out** to `.cursor/rules/` and `.agents/skills/` (not copies of those files).

---

## 5. Agents (subagent definitions)

| File                     | `.cursor/agents`      | `.opencode/agents`                | Match?                                                      |
| ------------------------ | --------------------- | --------------------------------- | ----------------------------------------------------------- |
| `ci-monitor-subagent.md` | `name`, `model: fast` | `mode: subagent` (no `name` line) | **Near-duplicate** — same role, editor-specific frontmatter |

---

## 6. Root entry points (AGENTS.md vs CLAUDE.md)

| File        | Role                                                                                   | Duplication                                                                                |
| ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `AGENTS.md` | Cross-editor handbook; Nx block (auto-updated); `.agents/skills` index; workflow-ralph | **Partial overlap** with `CLAUDE.md` on commands, architecture, code-style pointers        |
| `CLAUDE.md` | Claude Code entry; `@~/.claude/info.md`; defers to `AGENTS.md` for shared content      | Extends with Claude-specific “What this is” framing; longer Commands/Architecture sections |

**Strategy:** `CLAUDE.md` is not a copy of `AGENTS.md` — it includes Claude-only includes and duplicates some monorepo guidance for Claude Code sessions. Shared facts should stay in `AGENTS.md`; `CLAUDE.md` should link rather than fork (audit in task 3/4).

---

## 7. MCP and editor settings

| Config             | `.cursor`                  | `.claude`                     | `.vscode`               | Duplication                                                                        |
| ------------------ | -------------------------- | ----------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| MCP template       | `mcp.json.example`         | —                             | `mcp.json` (tracked)    | **Parallel** — same servers, different paths; secrets local                        |
| Workspace settings | `settings.json` (tracked)  | `settings.json` (permissions) | `settings.json.default` | **Overlapping keys** (ESLint, `NX_ISOLATE_PLUGINS`, API URL) — not identical files |
| Hooks              | `hooks.json` + `format.sh` | —                             | —                       | **Cursor-only**                                                                    |
| Worktrees          | `worktrees.json`           | —                             | —                       | **Cursor-only**; OpenCode has worktree **plugin** (different mechanism)            |

---

## 8. Developer app discovery

`openthrottle-developer` scans **only**:

- `.agents/skills`
- `.cursor/skills`

It does **not** scan `.claude/skills`, `skills/`, or `.opencode/skills`. Duplicates in those paths do not affect in-app skill listing unless also present under the two scanned trees.

---

## 9. Recommended edit targets (preview for consolidation doc)

| Task                                            | Edit here                              | Then sync/copy if needed                                                    |
| ----------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| Code style / OT rules                           | `.cursor/rules/`                       | — (others link in)                                                          |
| Cursor `/ot/*` or `/github/*` slash skill       | `.cursor/skills/<slug>/`               | Copy to `.claude/skills/<slug>/` (manual)                                   |
| Claude Code skill parity                        | `.claude/skills/`                      | Keep in lockstep with `.cursor` for shared 24 slugs                         |
| OT deep skill (plans, Ralph, generators, stack) | `.agents/skills/`                      | Optionally expose via `skills/` symlink if agentskills.io consumers need it |
| Ralph prompt                                    | `.cursor/skills/agents-ralph/SKILL.md` | Update `skills/` and `.opencode` copies if external consumers must match    |
| Persona                                         | `.agents/personas/`                    | —                                                                           |
| agentskills.io root discovery                   | `skills/` symlinks or copies           | Prefer symlink to `.agents/skills` for new skills                           |

---

## 10. Drift risks (watch list)

1. **`.cursor` / `.claude` lockstep** — 24 skills identical today; any edit to one tree should touch the other until automation exists.
2. **`agents-ralph`** — three variants (`disable-model-invocation`, echo path); Ralph CLI uses `.cursor` path per `tools/workflows/README.md`.
3. **`monitor-ci`** — three variants with behavioral differences (poll threshold, `$ARGUMENTS`); highest-risk drift for CI automation.
4. **`skills/agents-ralph`** — `disable-model-invocation: true` may block agent invocation when used from root `skills/` layout.
5. **Thin `ot-*` vs thick `ot-plans`** — intentional split; avoid merging without updating slash commands and `AGENTS.md` index.

---

**See also:** [agent-editor-folders-ownership.md](./agent-editor-folders-ownership.md) — canonical source of truth per concern and editor-unique content.

_Next tasks (same plan): consolidate into a single contributor reference and wire cross-links from `AGENTS.md`, `CLAUDE.md`, and `AGENT_INPUTS.md`._
