# Agent assets — canonical `.agents` layout and migration design

**Plan-Id:** `318f9dd8-f36c-4d1a-9826-7f8cf14a5e2c`  
**Task-Id:** `d260da5a-6cef-49c9-9646-5fadf5d9626a`  
**Decisions:** D1 (skills SSOT), D3 (rules SSOT, keep `.mdc`), D2 (disk write + DB read-only index)

This document defines the **canonical on-disk layout** for unified agent assets, **symlink conventions** for editor parity, **editor-native exceptions**, migration sequence, and **CI drift guard** spec. Contributor workflow: [CONTRIBUTING.md](../../CONTRIBUTING.md) § Agent assets, [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md), [AGENTS.md](../../AGENTS.md).

**Related:**

| Document                                                                             | Scope                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| [agent-editor-folders.md](./agent-editor-folders.md)                                 | Current folder tree (pre-migration baseline)      |
| [agent-editor-folders-duplication-map.md](./agent-editor-folders-duplication-map.md) | Historical duplicates and drift                   |
| [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md)                                | What agents load (paths to update post-migration) |
| Plan output stream (tasks `9fb55eac`, `8dc63467`)                                    | Inventory matrix and symlink spike results        |

---

## 1. Design principles

| Principle                    | Rule                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Single write tree**        | All skill and rule **bodies** are edited only under `.agents/`.                                      |
| **Editor paths are views**   | `.cursor/`, `.claude/`, repo-root `skills/` expose symlinks so existing consumers keep stable paths. |
| **No copy/codegen sync**     | Rejected for MVP (spike task `8dc63467`). Drift is a CI failure, not a sync script.                  |
| **Keep `.mdc` for rules**    | Rule SSOT stays `.agents/rules/**/*.mdc` (D3). No `.mdc` → `.md` rename in phase 1.                  |
| **Disk authority (D2)**      | Git is write SSOT; `custom_prompts` is a read-only index via future ingest (plan 1.5).               |
| **Relative symlink targets** | Targets are repo-relative so clones on different absolute paths work.                                |

---

## 2. Canonical layout (`.agents/` — sole write location)

```
.agents/
├── skills/                          # D1 — all SKILL.md bodies (36 slugs on branch)
│   └── <slug>/
│       ├── SKILL.md                 # Required; agentskills.io + Cursor frontmatter
│       ├── references/              # Optional supporting docs
│       ├── scripts/                 # Optional (e.g. monitor-ci)
│       └── …
├── rules/                           # D3 — all rule bodies (*.mdc)
│   ├── README.md                    # Canonical rules index (agent behavior, coding vs commands)
│   ├── coding/
│   │   └── *.mdc
│   ├── commands/
│   │   └── *.mdc
│   ├── personal-generators.mdc
│   ├── personal-general.mdc
│   ├── cursor-commands.mdc
│   ├── no-cursor-attribution.mdc
│   └── nx-rules.mdc                 # Tracked copy of Nx-generated rules (see §4)
├── personas/                        # Role prompts (Ralph --prompt-file)
│   ├── README.md
│   ├── _template.md
│   └── <id>.md                      # architect, product, legal, growth, …
├── prompts/                         # Ad-hoc prompt fragments (non-skill)
│   ├── _template.md
│   └── *.md
├── hooks/                           # Shared hook scripts (referenced by .cursor/hooks.json)
│   └── format.sh
└── learnings/                       # Non-ingested notes (optional; not agent SSOT)
```

### 2.1 Skills (D1)

| Attribute                | Value                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Write path**           | `.agents/skills/<slug>/SKILL.md`                                                                                                                                                   |
| **Slug**                 | Directory name; frontmatter `name` should match for discoverability                                                                                                                |
| **Categories on branch** | `github-*` (10), `ot-*` (7), `nx-*` (5), OT stack (4), contributor (7), Ralph (2), plus `agents-code-review`, `monitor-ci`, `link-workspace-packages`, `shadcn`, `secret-scanning` |
| **Thin vs thick**        | Intentional split preserved: e.g. `.agents/skills/ot-ask` (slash entry) vs `.agents/skills/ot-plans` (full MCP lifecycle) — both live under `.agents/skills/`                      |

### 2.2 Rules (D3)

| Attribute           | Value                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Write path**      | `.agents/rules/**/*.mdc`                                                                                          |
| **Count on branch** | 22 tracked `.mdc` files (21 content rules + `nx-rules.mdc`)                                                       |
| **Extension**       | `.mdc` only — Cursor rule engine and frontmatter                                                                  |
| **README**          | `.agents/rules/README.md` is canonical; `.cursor/rules/README.md` becomes symlink or thin pointer (see migration) |

### 2.3 Personas

| Attribute      | Value                                          |
| -------------- | ---------------------------------------------- |
| **Write path** | `.agents/personas/<id>.md`                     |
| **DB**         | None in MVP; disk-only                         |
| **Consumer**   | Ralph `--prompt-file .agents/personas/<id>.md` |

### 2.4 Prompts

| Attribute      | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| **Write path** | `.agents/prompts/*.md`                                        |
| **DB**         | `custom_prompts` (`prompt_type=prompts`) — ingest in plan 1.5 |
| **Use**        | Ralph prompt fragments; not Cursor slash skills               |

---

## 3. Editor views (symlinks only — no independent bodies)

After migration, these trees contain **only symlinks** (plus editor-native files listed in §4).

### 3.1 Skill directory symlinks

| Editor path             | Symlink target (relative)     | Purpose                                                           |
| ----------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `.cursor/skills/<slug>` | `../../.agents/skills/<slug>` | Cursor slash discovery (`/ot/*`, `/github/*`, Ralph default path) |
| `.claude/skills/<slug>` | `../../.agents/skills/<slug>` | Claude Code skill parity                                          |
| `skills/<slug>`         | `../.agents/skills/<slug>`    | [agentskills.io](https://agentskills.io) repo-root discovery      |

**Git mode:** `120000` directory symlinks. Create with:

```bash
ln -s ../../.agents/skills/<slug> .cursor/skills/<slug>
ln -s ../../.agents/skills/<slug> .claude/skills/<slug>
ln -s ../.agents/skills/<slug> skills/<slug>
```

**Coverage:** All **36** slugs under `.agents/skills/` get `.cursor` and `.claude` symlinks. Repo-root `skills/` symlinks are **optional subset** for external agentskills.io consumers (historically 7 symlinks + copies); prefer symlinks over copies for any slug exposed at root.

### 3.2 Rule file symlinks

| Editor path                    | Symlink target (relative)                    | Notes                                                    |
| ------------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| `.cursor/rules/coding/*.mdc`   | `../../../.agents/rules/coding/<file>.mdc`   | File symlink per rule                                    |
| `.cursor/rules/commands/*.mdc` | `../../../.agents/rules/commands/<file>.mdc` | File symlink per rule                                    |
| `.cursor/rules/*.mdc` (root)   | `../../.agents/rules/<file>.mdc`             | `personal-*`, `cursor-commands`, `no-cursor-attribution` |

**Exception:** `.cursor/rules/nx-rules.mdc` — see §4 (generated, not symlinked from SSOT at edit time).

**README handling:** Replace `.cursor/rules/README.md` with symlink → `../../.agents/rules/README.md` OR keep a one-line pointer file that links to canonical README (prefer symlink for zero drift).

### 3.3 Repo-root entry docs (symlinks or single files)

| Path        | Target                          | Notes                                                       |
| ----------- | ------------------------------- | ----------------------------------------------------------- |
| `AGENTS.md` | **Single file** (not symlinked) | Cross-editor handbook; update paths to cite `.agents/rules` |
| `CLAUDE.md` | **Single file**                 | Defers to `AGENTS.md`; update rule path references          |

Do **not** symlink `AGENTS.md` / `CLAUDE.md` into `.agents/` — they are entry points, not rule bodies.

---

## 4. Editor-native exceptions (not symlinked SSOT)

These files **stay in editor trees** and are edited in place. They are **not** mirrored into `.agents/` as SSOT (except shared scripts invoked by hooks).

| Path                           | Why editor-native                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/hooks.json`           | Cursor hooks API                                                                                                                          |
| `.cursor/hooks/format.sh`      | May invoke `.agents/hooks/format.sh` or stay under `.cursor/hooks/` — hook **config** is Cursor-only                                      |
| `.cursor/mcp.json.example`     | Cursor MCP template; secrets in local `.cursor/mcp.json`                                                                                  |
| `.cursor/mcp.json`             | Gitignored; local secrets                                                                                                                 |
| `.cursor/worktrees.json`       | Cursor worktree integration                                                                                                               |
| `.cursor/settings.json`        | Cursor workspace settings                                                                                                                 |
| `.cursor/agents/*.md`          | Cursor subagent definitions (frontmatter differs from OpenCode)                                                                           |
| `.cursor/cli-config.json`      | Gitignored local CLI config                                                                                                               |
| `.cursor/rules/nx-rules.mdc`   | **Generated** by Nx Console; gitignored under `.cursor/rules/`                                                                            |
| `.agents/rules/nx-rules.mdc`   | **Tracked snapshot** for non-Cursor consumers; regenerated manually or by Nx when workspace changes — not a symlink target from `.cursor` |
| `.vscode/*`                    | VS Code defaults; separate from Cursor                                                                                                    |
| `.opencode/**`                 | OpenCode commands, plugins, partial skill copies — out of MVP symlink scope                                                               |
| `.claude/settings.json`        | Claude Code permissions/MCP                                                                                                               |
| `.workflow-ralph.json.example` | Ralph CLI local defaults                                                                                                                  |

**Ralph stable paths:** Consumers may keep referencing `.cursor/skills/agents-ralph/SKILL.md` in docs and CLI defaults; after migration that path resolves via symlink to `.agents/skills/agents-ralph/SKILL.md`.

---

## 5. Alignment with AGENT_INPUTS discoverability

[AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md) lists **what agents load**. After migration:

| AGENT_INPUTS reference today                      | Canonical write path                    | Load path (unchanged for agents)         |
| ------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| `.cursor/rules/personal-generators.mdc`           | `.agents/rules/personal-generators.mdc` | `.cursor/rules/...` via symlink          |
| `.cursor/rules/coding/*.mdc`                      | `.agents/rules/coding/*.mdc`            | `.cursor/rules/coding/...` via symlink   |
| `.cursor/rules/commands/*.mdc`                    | `.agents/rules/commands/*.mdc`          | `.cursor/rules/commands/...` via symlink |
| `.agents/skills/openthrottle-generators/SKILL.md` | same                                    | same (already SSOT)                      |
| `.cursor/rules/README.md`                         | `.agents/rules/README.md`               | symlink                                  |

**Contributor docs (task `3378f82c`, done):**

- **Edit** under `.agents/rules/` and `.agents/skills/`
- **Load** via `.cursor/rules/` and `.cursor/skills/` (symlink views)
- See [AGENT_INPUTS.md](../tools/templates/AGENT_INPUTS.md), [CONTRIBUTING.md](../../CONTRIBUTING.md) § Agent assets

Discoverability checklist (§3 of AGENT_INPUTS): `AGENTS.md`, `.agents/rules/README.md`, `personal-generators.mdc`, `AGENT_USAGE.md`.

---

## 6. Developer app and tooling impacts

| Consumer                         | Behavior post-migration                                  | Follow-up                                                                                                                                               |
| -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discover-repo-skills.server.ts` | Scans `.agents/skills` + `.cursor/skills`                | **Fix required:** treat symlinked skill dirs as directories (`isSymbolicLink()` + `statSync().isDirectory()`) — plan 1.5 or bundled with migration task |
| Skills UI dedupe                 | Same slug may appear under `agents` and `cursor` layouts | Optional `realpath` dedupe in plan 1.5                                                                                                                  |
| `job-run-lifecycle-hooks.ts`     | Allows `.agents/skills/` or `.cursor/skills/`            | Both resolve to same body after symlinks                                                                                                                |
| Ralph `readRalphPromptFileUtf8`  | `readFileSync` through symlinks                          | Verified in spike (PASS)                                                                                                                                |
| OpenCode `.opencode/skills`      | 9 manual copies remain                                   | Out of MVP; align or symlink in plan 1.5                                                                                                                |

---

## 7. Migration sequence (task `84ed557c`)

Execute in order after this design is approved.

### Phase A — Skills (partially done on branch)

1. **Verify** all skill bodies live under `.agents/skills/` (36 slugs) — **done on branch**.
2. **Create** `.cursor/skills/` and `.claude/skills/` directories.
3. **For each slug** in `.agents/skills/`, add directory symlinks in `.cursor/skills/` and `.claude/skills/`.
4. **Recreate** repo-root `skills/` with symlinks for agentskills.io subset (see historical `skills/README.md`).
5. **Resolve drift:** delete independent `.opencode/skills` copies only when OpenCode parity is explicitly scoped (defer or symlink in 1.5).

### Phase B — Rules

1. **Verify** all rule bodies under `.agents/rules/**/*.mdc` (22 files) — **done on branch**; `.cursor/rules` holds duplicate inodes today.
2. **Remove** each regular file under `.cursor/rules/**/*.mdc` (except `nx-rules.mdc`).
3. **Replace** with file symlinks → corresponding `.agents/rules/**` path.
4. **Symlink** `.cursor/rules/README.md` → `.agents/rules/README.md`.
5. **Leave** `.cursor/rules/nx-rules.mdc` as generated gitignored file; keep `.agents/rules/nx-rules.mdc` as tracked snapshot updated when Nx workspace changes.

### Phase C — CI drift guard

Add `scripts/check-agent-assets-ssot.sh` (or Nx target `monorepo:check-agent-assets`) invoked in CI / `check:local`:

| Check                         | Failure condition                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **No duplicate rule bodies**  | Any `.cursor/rules/**/*.mdc` (except `nx-rules.mdc`) that is a regular file or hard link with same content as `.agents/rules/` |
| **No duplicate skill bodies** | Any `SKILL.md` under `.cursor/skills/`, `.claude/skills/`, or `skills/` that is not a symlink into `.agents/skills/`           |
| **Symlink target validity**   | Broken symlinks under editor trees                                                                                             |
| **Optional: inode guard**     | `stat` shows editor paths for rules/skills are symlinks (mode `120000`) not separate inodes                                    |

Exit non-zero on violation; document fix: edit `.agents/` only, recreate symlinks.

### Phase D — Docs (task `3378f82c`) — done

Updated `agent-editor-folders.md`, `AGENTS.md`, `AGENT_INPUTS.md`, `CONTRIBUTING.md` § Agent assets.

---

## 8. Near-duplicate resolution

| Asset                               | Resolution                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **agents-ralph**                    | Canonical: `.agents/skills/agents-ralph/SKILL.md`; `.cursor` path via symlink; drop independent `.opencode` body or align in 1.5 |
| **monitor-ci**                      | Canonical: `.agents/skills/monitor-ci/SKILL.md` (threshold 13, rich `$ARGUMENTS` parsing)                                        |
| **Rules README**                    | Single body: `.agents/rules/README.md`; `.cursor` symlink                                                                        |
| **Thin `ot-*` vs thick `ot-plans`** | Both under `.agents/skills/`; no merge                                                                                           |

---

## 9. Windows and contributor requirements

From symlink spike (`8dc63467`):

- **Require** `git config core.symlinks true` (or WSL clone) on Windows; see [CONTRIBUTING.md](../../CONTRIBUTING.md) § Agent assets.
- **CI** runs on Unix — symlinks enforced there.
- **Sandbox:** symlink creation may need workspace allowlist (Cursor dev OK).

---

## 10. Out of scope (this plan / MVP)

- `custom_prompts` ingest and front-matter CI (plan 1.5)
- Developer app search UX (plan 2.0)
- OpenCode full symlink parity
- `.mdc` → `.md` rename
- Copy/codegen sync scripts
- In-app git-bypass edits

---

## 11. Acceptance criteria (task `d260da5a`)

- [x] Canonical `.agents/` tree defined (skills, rules, personas, prompts)
- [x] D1: `.agents/skills/` sole write location; editor folders symlink-only
- [x] D3: `.agents/rules/**/*.mdc` sole write location; `.mdc` retained
- [x] Symlink target conventions documented (relative paths)
- [x] Editor-native exceptions enumerated
- [x] Migration sequence for task `84ed557c` outlined
- [x] CI drift guard spec (duplicate bodies, non-symlink copies)
- [x] AGENT_INPUTS discoverability alignment noted
- [x] Cross-references to inventory, duplication map, symlink spike
