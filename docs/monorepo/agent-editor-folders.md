# Agent and editor folders — contributor reference

Single entry point for **where agent- and editor-specific config lives** in the OpenThrottle monorepo: folder layout, what's authored vs generated, and where to edit for common tasks.

- **Skills** are managed by the **`skill-sync`** skill — see [`skills/skill-sync/SKILL.md`](../../skills/skill-sync/SKILL.md) (mechanism) and [docs/Skills.md](../Skills.md) (adoption policy + installed set).
- **Rules / personas / prompts** use `.agents/` as their source of truth, with `.cursor/rules/` symlink views for the IDE.

**Related entry points (link, don't fork):**

| Document                                                       | Scope                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [AGENTS.md](../../AGENTS.md)                                   | Cross-editor handbook: Nx, OT skills index, workflow-ralph CLI, code-style pointer |
| [CLAUDE.md](../../CLAUDE.md)                                   | Claude Code project entry; defers shared facts to `AGENTS.md`                      |
| [docs/Skills.md](../Skills.md)                                 | Skill adoption policy, installed set, skip-list                                    |
| [skills/skill-sync/SKILL.md](../../skills/skill-sync/SKILL.md) | The skill-sync architecture + `sync.sh` / `--check` commands                       |
| [.agents/rules/README.md](../../.agents/rules/README.md)       | Rules layout, agent behavior (OT-only plans, generators first)                     |
| [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md)          | What agents should load: rules list, example commands, discoverability             |

---

## 1. Folder tree (overview)

```bash
repo root
├── AGENTS.md, CLAUDE.md              # Cross-editor entry points (edit in place)
├── .workflow-ralph.json.example      # Ralph CLI local defaults (example)
├── skills/                           # ★ SSOT for OT-authored skills (one dir per skill, committed)
├── skills-lock.json                  # Lockfile for external skills (npx skills add …), hash-pinned
├── .agents/                          # SSOT for rules, personas, prompts
│   ├── skills/                       # GENERATED merged view: symlinks → skills/*  +  real dirs = external installs
│   ├── rules/                        # All rule bodies (*.mdc) — SSOT (incl. frontend-design-openthrottle.mdc overlay)
│   ├── personas/                     # Role prompts (architect, product, …) — SSOT
│   └── prompts/                      # Ad-hoc prompt fragments — SSOT
├── .cursor/
│   ├── rules/                        # Symlinks → .agents/rules/ (Cursor activation)
│   ├── agents/                       # Cursor subagent definitions
│   ├── hooks/ + hooks.json           # afterFileEdit → format.sh
│   ├── mcp.json              # openthrottle-mcp template
│   ├── settings.json, worktrees.json
├── .claude/
│   ├── settings.json                 # Permissions, MCP enablement
│   └── skills/                       # GENERATED fan-out: symlinks → .agents/skills/ (gitignored)
└── .vscode/
    ├── settings.json.default, extensions.json, launch.json, mcp.json
```

> **Skills are two-stage and fully generated.** `skill-sync` builds `skills/*` → `.agents/skills/` (stage 1), then `.agents/skills/*` → each agent fan-out such as `.claude/skills/` (stage 2). The dedicated `.cursor/skills` fan-out was **dropped**: Cursor 2.4+ reads `.agents/skills/` (and `.claude/skills/`) directly, so it needs no separate copy. Every supported CLI (Claude Code, Cursor, Codex, Grok Build, OpenCode) now reads the `SKILL.md` standard — they differ only in which dirs they scan, with `.agents/skills/` + `.claude/skills/` the two near-universal in-repo targets. **Never hand-edit** `.agents/skills/` or `.claude/skills/`.

**Sync + drift gate:**

```bash
bash skills/skill-sync/scripts/sync.sh          # (re)generate the layout (idempotent)
bash skills/skill-sync/scripts/sync.sh --check  # validate without writing (CI drift gate)
```

**CI guard:** `pnpm nx run monorepo:check-agent-assets-ssot` runs `skill-sync --check` (skill layout) + `.cursor/rules` symlink integrity. CI materializes the generated skill symlinks with `sync.sh` before checking. Skill tags live on `project_skills` rows (GraphQL / `/skills` UI), not in a repo-root overlay file.

> **External server-scoped consumer — foreign-workspace skill injection.** Beyond the in-repo `sync.sh` fan-out above, the running OpenThrottle **server** projects the curated `skills/` SSOT (plus an opt-in per-user tier) INTO **foreign** repos it drives — any checkout outside this monorepo — so OT's skills are available there. It is **layered** (OT curated < personal < target repo, target wins on a name collision), **server-scoped** (materialized lazily on the first foreign run per repo, reused across runs, torn down on shutdown + a boot reaper for crashes), and **non-mutating**: injected entries go into the target's `.agents/skills` + `.claude/skills` as symlinks (host) / copies (container path bridge), hidden from `git status` via the target's **untracked `.git/info/exclude`** (never the tracked `.gitignore`) plus a per-repo ledger stored outside the repo — so the consumer's tracked files are never touched and `git status` stays clean at all times. This is a separate consumer of the same SSOT; it does not change `sync.sh`. Full design: [foreign-workspace-skill-injection.md](./foreign-workspace-skill-injection.md).

---

## 2. What's authored vs generated

| Concern            | Author here (SSOT)                                                                                                        | Generated (do not edit)                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| OT-owned skills    | `skills/<slug>/SKILL.md`                                                                                                  | `.agents/skills/<slug>` (symlink), `.claude/skills/<slug>` |
| External skills    | `npx skills add <owner>/<repo> --skill <name> --agent universal` (→ `skills-lock.json` + a real dir in `.agents/skills/`) | `.claude/skills/<slug>`                                    |
| Rules              | `.agents/rules/**/*.mdc`                                                                                                  | `.cursor/rules/**/*.mdc`                                   |
| Personas / prompts | `.agents/personas/`, `.agents/prompts/`                                                                                   | — (loaded via Ralph `--prompt-file`)                       |
| Skill tags         | `project_skills.tags` (GraphQL / `/skills` UI; ingest does not write tags)                                                | —                                                          |

**Editor-native** (not generated, not SSOT-mirrored): `.cursor/hooks.json`, local `.cursor/mcp.json` (from `mcp.json`), `.cursor/worktrees.json`, generated `.cursor/rules/nx-rules.mdc` (gitignored).

**Customizing an external skill:** never edit the vendored copy — it stays 1:1 with upstream and a re-sync would overwrite it. Author a companion skill or rule in `skills/` / `.agents/rules/` that references it. Exemplar: [`.agents/rules/coding/frontend-design-openthrottle.mdc`](../../.agents/rules/coding/frontend-design-openthrottle.mdc) overlays the vendored `frontend-design` skill. See [docs/Skills.md](../Skills.md).

---

## 3. Where to edit (common tasks)

| I want to…                             | Do this                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Add an **OT-owned skill**              | Create `skills/<slug>/SKILL.md`, run `sync.sh`. Tag the ingested record in `/skills` (not a JSON overlay)             |
| Install an **external skill**          | `npx skills add <owner>/<repo> --skill <name> --agent universal`, run `sync.sh` (keep it 1:1)                         |
| **Customize** an external skill        | Author a companion skill/rule that references it — don't edit the vendored copy (see §2)                              |
| Change **TypeScript / JS style**       | `.agents/rules/coding/*.mdc` (not the `.cursor/rules/` symlink)                                                       |
| Change **OT / GitHub / Ralph rules**   | `.agents/rules/commands/*.mdc`                                                                                        |
| Change **Ralph loop** behavior         | `skills/agents-ralph/SKILL.md`                                                                                        |
| Change **Ralph CLI** flags / queue     | `skills/workflow-ralph/`, `tools/workflows/`                                                                          |
| Add a **persona**                      | `.agents/personas/<id>.md` from `_template.md`                                                                        |
| Configure **openthrottle-mcp** locally | Copy `.cursor/mcp.json` → `.cursor/mcp.json` (full guide: [mcp-registration.md](../openthrottle/mcp-registration.md)) |
| Recreate generated links after clone   | `bash skills/skill-sync/scripts/sync.sh`                                                                              |

---

## 4. Git tracking (summary)

| Tracked                                                                                  | Ignored / local                                                                                 |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `skills/**` (OT-owned bodies), `skills-lock.json`                                        | —                                                                                               |
| `.agents/skills/<external-slug>/**` (real dirs — vendored, pinned by `skills-lock.json`) | `.agents/skills/<own-slug>` (symlinks — generated, regenerated by `sync.sh`)                    |
| `.agents/rules/**/*.mdc`, `.agents/personas/`, `.agents/prompts/`                        | —                                                                                               |
| `.cursor/rules/**/*.mdc` (symlinks; except generated `nx-rules.mdc`)                     | `nx-rules.mdc`, `.cursor/mcp.json`, `.cursor/cli-config.json`                                   |
| `.cursor/hooks.json`, `worktrees.json`, `settings.json`, `.cursor/mcp.json`              | `.claude/skills/` (generated fan-out), Claude `projects/` / `sessions/` / `settings.local.json` |
| `.vscode/settings.json.default`                                                          | `.vscode/settings.json`, `CLAUDE.local.md`                                                      |

> The `.gitignore` "Managed by OpenThrottle skill-sync" block ignores `.agents/skills/*` (the own-skill symlinks) and all of `.claude/skills/`, while un-ignoring `.agents/skills/*/` so vendored external-install directories stay tracked. CI regenerates the ignored symlinks with `sync.sh` before running the drift gate.

---

## 5. Windows and contributor requirements

Generated skill/rule links are symlinks. On Windows, enable symlink support (`git config core.symlinks true`) or clone inside WSL; otherwise the generated trees appear as plain files and CI fails. Run `bash skills/skill-sync/scripts/sync.sh` after cloning (and after any skill install) to materialize the layout.

---

## 6. How this doc relates to AGENTS.md and AGENT_INPUTS.md

| Document                                                           | Owns                                                               | Does not own                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------ |
| **This doc**                                                       | Folder layout, authored-vs-generated, where to edit                | Rule/skill bodies, the skill-sync contract |
| **[skills/skill-sync/SKILL.md](../../skills/skill-sync/SKILL.md)** | The skill-sync architecture, `sync.sh`/`--check`, ownership rules  | Rules/personas/prompts layout              |
| **[docs/Skills.md](../Skills.md)**                                 | Skill adoption policy, installed set, skip-list                    | Physical folder tree                       |
| **[AGENTS.md](../../AGENTS.md)**                                   | Nx guidelines, skills index, workflow-ralph CLI, pointers to rules | Per-editor folder inventory                |

When onboarding agents: point them at **AGENT_INPUTS.md** for _what to load_ and **this doc** for _where files live_. When changing behavior: author skills in `skills/` (or install external ones with the CLI) and edit rules in `.agents/rules/`, never the generated trees.
