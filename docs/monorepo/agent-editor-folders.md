# Agent and editor folders — contributor reference

Single entry point for **where agent- and editor-specific config lives** in the OpenThrottle monorepo: folder layout, what's authored vs generated, and where to edit for common tasks.

- **Skills** are managed by the **`ot-skill-sync`** skill — see [`skills/ot-skill-sync/SKILL.md`](../../skills/ot-skill-sync/SKILL.md) (mechanism) and [docs/Skills.md](../Skills.md) (adoption policy + installed set).
- **Rules / personas / prompts** use `.agents/` as their source of truth, with `.cursor/rules/` symlink views for the IDE.

> **SSOT in one paragraph.** Rule **bodies** live under [`.agents/rules/`](../../.agents/rules/) only — Cursor loads them through [`.cursor/rules/`](../../.cursor/rules/) **symlinks**, so never edit that view. Skill **bodies** are authored under [`skills/`](../../skills/) and generated into `.agents/skills/`; `.claude/skills/` and `.gemini/skills/` are the per-agent fan-outs. Cursor 2.4+ reads `.agents/skills/` directly — there is no `.cursor/skills` fan-out. Edit `skills/` and `.agents/rules/` in git PRs and re-run `sync.sh`; never hand-edit a generated skill directory.

**Related entry points (link, don't fork):**

| Document                                                             | Scope                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [AGENTS.md](../../AGENTS.md)                                         | Cross-editor handbook: Nx, OT skills index, workflow-ralph CLI, code-style pointer |
| [CLAUDE.md](../../CLAUDE.md)                                         | Claude Code project entry; defers shared facts to `AGENTS.md`                      |
| [docs/Skills.md](../Skills.md)                                       | Skill adoption policy, installed set, skip-list                                    |
| [skills/ot-skill-sync/SKILL.md](../../skills/ot-skill-sync/SKILL.md) | The ot-skill-sync architecture + `sync.sh` / `--check` commands                    |
| [.agents/rules/README.md](../../.agents/rules/README.md)             | Rules layout, agent behavior (OT-only plans, generators first)                     |
| [AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)                  | What agents should load: rules list, generator commands, discoverability           |

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
│   └── prompts/                      # Prompt fragments + Job_* scheduled runs — SSOT
├── .claude-plugin/marketplace.json    # Marketplace listing for plugins/ (this repo hosts its own)
├── plugins/openthrottle/             # GENERATED Claude plugin payload (bundle-hooks) — hooks for CHILD repos
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

> **Skills are two-stage and fully generated.** `ot-skill-sync` builds `skills/*` → `.agents/skills/` (stage 1), then `.agents/skills/*` → each agent fan-out — currently `.claude/skills/` **and `.gemini/skills/`** (stage 2). The dedicated `.cursor/skills` fan-out was **dropped**: Cursor reads `.agents/skills/` (and `.claude/skills/`) directly, so it needs no separate copy. Every supported CLI reads the `SKILL.md` standard and they differ only in which dirs they scan — Cursor, Grok Build, and Antigravity (`agy`) read `.agents/skills/` in-repo; Claude Code reads only `.claude/skills/` and the Gemini CLI only `.gemini/skills/`, which is why both are fan-out targets. The verified per-CLI matrix (including codex, which has no in-repo skills dir, and opencode's `.opencode/skill(s)`) lives in [`skills/ot-skill-sync/SKILL.md`](../../skills/ot-skill-sync/SKILL.md). **Never hand-edit** `.agents/skills/`, `.claude/skills/`, or `.gemini/skills/`.

> **Hooks reach child repositories differently from skills — do not copy the skills pattern.** The
> per-tool hook bundles under `.claude/hooks/` and `.cursor/hooks/` only fire _inside this repo_.
> Hooks for other repositories ship as the generated plugin payload at `plugins/openthrottle/`,
> delivered either by a marketplace install or by `--plugin-dir` at spawn time — **never** by writing
> into the target checkout. Skills had to be materialized into foreign repos because no CLI can load
> them from outside the working tree; every CLI we support can load hooks from outside it. See
> [child-repo-hook-overlay.md](./child-repo-hook-overlay.md). `plugins/openthrottle/` is generated by
> `@openthrottle/agentic-hooks:bundle-hooks` and drift-gated — **never hand-edit** it either.

**Sync + drift gate:**

```bash
bash skills/ot-skill-sync/scripts/sync.sh          # (re)generate the layout (idempotent)
bash skills/ot-skill-sync/scripts/sync.sh --check  # validate without writing (CI drift gate)
```

**CI guard:** `pnpm nx run monorepo:check-agent-assets-ssot` runs `ot-skill-sync --check` (skill layout) + `.cursor/rules` symlink integrity. CI materializes the generated skill symlinks with `sync.sh` before checking. Skill tags live on `project_skills` rows (GraphQL / `/skills` UI), not in a repo-root overlay file.

> **External server-scoped consumer — foreign-workspace skill injection.** Beyond the in-repo `sync.sh` fan-out above, the running OpenThrottle **server** projects the curated `skills/` SSOT (plus an opt-in per-user tier) INTO **foreign** repos it drives — any checkout outside this monorepo — so OT's skills are available there. It is **layered** (OT curated < personal < target repo, target wins on a name collision), **server-scoped** (materialized lazily on the first foreign run per repo, reused across runs, torn down on shutdown + a boot reaper for crashes), and **non-mutating**: injected entries go into the target's `.agents/skills` + `.claude/skills` as symlinks (host) / copies (container path bridge), hidden from `git status` via the target's **untracked `.git/info/exclude`** (never the tracked `.gitignore`) plus a per-repo ledger stored outside the repo — so the consumer's tracked files are never touched and `git status` stays clean at all times. This is a separate consumer of the same SSOT; it does not change `sync.sh`. Full design: [foreign-workspace-skill-injection.md](./foreign-workspace-skill-injection.md).

---

## 2. What's authored vs generated

| Concern            | Author here (SSOT)                                                                                                                                 | Generated (do not edit)                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| OT-owned skills    | `skills/<slug>/SKILL.md`                                                                                                                           | `.agents/skills/<slug>` (symlink), `.claude/skills/<slug>`, `.gemini/skills/<slug>` |
| External skills    | `npx skills add <owner>/<repo> --skill <name> --agent universal` (→ `skills-lock.json` + a real dir in `.agents/skills/`)                          | `.claude/skills/<slug>`, `.gemini/skills/<slug>`                                    |
| Personal skills    | `~/.openthrottle/skills/<slug>/SKILL.md` — **outside the repo**, per-user, never committed (`OPENTHROTTLE_PERSONAL_SKILLS_DIR` overrides the root) | `.agents/skills/<slug>` (symlink), `.claude/skills/<slug>`, `.gemini/skills/<slug>` |
| Rules              | `.agents/rules/**/*.mdc`                                                                                                                           | `.cursor/rules/**/*.mdc`                                                            |
| Personas / prompts | `.agents/personas/`, `.agents/prompts/`                                                                                                            | — (loaded via Ralph `--prompt-file`)                                                |
| Skill tags         | `project_skills.tags` (GraphQL / `/skills` UI; ingest does not write tags)                                                                         | —                                                                                   |

### Prompt filename conventions (`.agents/prompts/`)

Prompts are flat files in `.agents/prompts/`; the walker derives slug and title from the filename, so **no frontmatter is required**. The filename prefix says how the prompt is invoked:

| Prefix       | Meaning                                                                                                                                                                                                  | Example             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `Before_*`   | Lifecycle hook — injected before a run                                                                                                                                                                   | `Before_Joke.md`    |
| `After_*`    | Lifecycle hook — injected after a run                                                                                                                                                                    | `After_Fact.md`     |
| `Job_*`      | Standalone **scheduled run**, not a lifecycle hook. Self-contained; invoked via Ralph `--prompt-file` or an OT scheduled job. Read-only on source; its only side effect is filing one OpenThrottle plan. | `Job_TestHealth.md` |
| `_template*` | Authoring template, skipped by the walker                                                                                                                                                                | `_template.md`      |

`Job_*` prompts deliberately repeat their shared rules rather than referencing a common preamble — they must work standalone when handed to any agent CLI, and a broken cross-file reference in an unattended run costs more than the duplication.

**Editor-native** (not generated, not SSOT-mirrored): `.cursor/hooks.json`, local `.cursor/mcp.json` (from `mcp.json`), `.cursor/worktrees.json`, generated `.cursor/rules/nx-rules.mdc` (gitignored).

**Customizing an external skill:** never edit the vendored copy — it stays 1:1 with upstream and a re-sync would overwrite it. Author a companion skill or rule in `skills/` / `.agents/rules/` that references it. Exemplar: [`.agents/rules/coding/frontend-design-openthrottle.mdc`](../../.agents/rules/coding/frontend-design-openthrottle.mdc) overlays the vendored `frontend-design` skill. See [docs/Skills.md](../Skills.md).

---

## 3. Where to edit (common tasks)

| I want to…                             | Do this                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add an **OT-owned skill**              | Create `skills/<slug>/SKILL.md`, run `sync.sh`. Tag the ingested record in `/skills` (not a JSON overlay)                                        |
| Try a **private skill** of your own    | `bash skills/ot-skill-sync/scripts/personal.sh new <slug>` — lands outside the repo, uncommittable; `promote <slug>` graduates it into `skills/` |
| Install an **external skill**          | `npx skills add <owner>/<repo> --skill <name> --agent universal`, run `sync.sh` (keep it 1:1)                                                    |
| **Customize** an external skill        | Author a companion skill/rule that references it — don't edit the vendored copy (see §2)                                                         |
| Change **TypeScript / JS style**       | `.agents/rules/coding/*.mdc` (not the `.cursor/rules/` symlink)                                                                                  |
| Change **OT / GitHub / Ralph rules**   | `.agents/rules/commands/*.mdc`                                                                                                                   |
| Change **Ralph loop** behavior         | `skills/agents-ralph/SKILL.md`                                                                                                                   |
| Change **Ralph CLI** flags / queue     | `skills/workflow-ralph/`, `tools/workflows/`                                                                                                     |
| Add a **persona**                      | `.agents/personas/<id>.md` from `_template.md`                                                                                                   |
| Configure **openthrottle-mcp** locally | Copy `.cursor/mcp.json` → `.cursor/mcp.json` (full guide: [mcp-registration.md](../openthrottle/mcp-registration.md))                            |
| Recreate generated links after clone   | `bash skills/ot-skill-sync/scripts/sync.sh`                                                                                                      |

---

## 4. Git tracking (summary)

| Tracked                                                                                  | Ignored / local                                                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `skills/**` (OT-owned bodies), `skills-lock.json`                                        | —                                                                                                                   |
| `.agents/skills/<external-slug>/**` (real dirs — vendored, pinned by `skills-lock.json`) | `.agents/skills/<own-slug>` (symlinks — generated, regenerated by `sync.sh`)                                        |
| `.agents/rules/**/*.mdc`, `.agents/personas/`, `.agents/prompts/`                        | —                                                                                                                   |
| `.cursor/rules/**/*.mdc` (symlinks; except generated `nx-rules.mdc`)                     | `nx-rules.mdc`, `.cursor/mcp.json`, `.cursor/cli-config.json`                                                       |
| `.cursor/hooks.json`, `worktrees.json`, `settings.json`, `.cursor/mcp.json`              | `.claude/skills/` + `.gemini/skills/` (generated fan-out), Claude `projects/` / `sessions/` / `settings.local.json` |
| `.vscode/settings.json.default`                                                          | `.vscode/settings.json`, `CLAUDE.local.md`                                                                          |

> The `.gitignore` "Managed by OpenThrottle ot-skill-sync" block ignores `.agents/skills/*` (the own-skill symlinks) and all of `.claude/skills/` and `.gemini/skills/`, while un-ignoring `.agents/skills/*/` so vendored external-install directories stay tracked. CI regenerates the ignored symlinks with `sync.sh` before running the drift gate.
>
> **Personal skills** (`~/.openthrottle/skills/`) are covered by the same block — their in-repo footprint is only symlinks, and git treats a symlink as a file, so `!.agents/skills/*/` never rescues one. That is asserted rather than assumed: `--check` runs `git check-ignore` on every personal link, and a pre-commit guard refuses to stage one. CI has no personal root and, with it absent, every code path behaves exactly as it did before the tier existed.

---

## 5. Windows and contributor requirements

Generated skill/rule links are symlinks. On Windows, enable symlink support (`git config core.symlinks true`) or clone inside WSL; otherwise the generated trees appear as plain files and CI fails. Run `bash skills/ot-skill-sync/scripts/sync.sh` after cloning (and after any skill install) to materialize the layout.

---

## 6. How this doc relates to AGENTS.md and AGENT_USAGE.md

| Document                                                                 | Owns                                                                 | Does not own                                  |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------- |
| **This doc**                                                             | Folder layout, authored-vs-generated, where to edit                  | Rule/skill bodies, the ot-skill-sync contract |
| **[skills/ot-skill-sync/SKILL.md](../../skills/ot-skill-sync/SKILL.md)** | The ot-skill-sync architecture, `sync.sh`/`--check`, ownership rules | Rules/personas/prompts layout                 |
| **[docs/Skills.md](../Skills.md)**                                       | Skill adoption policy, installed set, skip-list                      | Physical folder tree                          |
| **[AGENTS.md](../../AGENTS.md)**                                         | Nx guidelines, skills index, workflow-ralph CLI, pointers to rules   | Per-editor folder inventory                   |
| **[AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)**                  | What agents load: the rule set, generator commands, discoverability  | Physical folder tree                          |

When onboarding agents: point them at **[AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)** for _what to load_ and **this doc** for _where files live_. When changing behavior: author skills in `skills/` (or install external ones with the CLI) and edit rules in `.agents/rules/`, never the generated trees.
