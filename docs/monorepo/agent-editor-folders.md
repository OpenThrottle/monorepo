# Agent and editor folders — contributor reference

Single entry point for **where agent- and editor-specific config lives** in the OpenThrottle monorepo: folder layout, what's authored vs generated, and where to edit for common tasks.

- **Skills** are managed by the **`ot-skill-sync`** skill — see [`skills/ot-skill-sync/SKILL.md`](../../skills/ot-skill-sync/SKILL.md) (mechanism) and [docs/Skills.md](../Skills.md) (adoption policy + installed set).
- **Personas / prompts** live under `.agents/` as their source of truth.
- **Code style** is no longer a per-editor rules tree: it is normative in [`AGENTS.md`](../../AGENTS.md) § Code style, with rationale in [code-style.md](./code-style.md).

> **SSOT in one paragraph.** Skill **bodies** are authored under [`skills/`](../../skills/) and generated into `.agents/skills/`; `.claude/skills/` is the per-agent fan-out. Cursor 2.4+ reads `.agents/skills/` directly — there is no `.cursor/skills` fan-out. Edit `skills/` in git PRs and re-run `sync.sh`; never hand-edit a generated skill directory. **Code style has no generated view at all** — it is plain Markdown that every agent reads natively: normative in [`AGENTS.md`](../../AGENTS.md) § Code style, with rationale and examples in [code-style.md](./code-style.md).

**Related entry points (link, don't fork):**

| Document                                                             | Scope                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [AGENTS.md](../../AGENTS.md)                                         | Cross-editor handbook: Nx, OT skills index, plan runs, code-style pointer      |
| [CLAUDE.md](../../CLAUDE.md)                                         | Claude Code only: model picking, `.claude/` config; all else is in `AGENTS.md` |
| [docs/Skills.md](../Skills.md)                                       | Skill adoption policy, installed set, skip-list                                |
| [skills/ot-skill-sync/SKILL.md](../../skills/ot-skill-sync/SKILL.md) | The ot-skill-sync architecture + `sync.sh` / `--check` commands                |
| [code-style.md](./code-style.md)                                     | The coding rules: rationale, examples, and each rule's enforcement label       |
| [AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)                  | What agents should load: rules pointer, generator commands, discoverability    |

---

## 1. Folder tree (overview)

```bash
repo root
├── AGENTS.md, CLAUDE.md              # Cross-editor entry points (edit in place)
├── skills/                           # ★ SSOT for OT-authored skills (one dir per skill, committed)
├── skills-lock.json                  # Lockfile for external skills (npx skills add …), hash-pinned
├── .agents/                          # SSOT for personas, prompts
│   ├── skills/                       # GENERATED merged view: symlinks → skills/*  +  real dirs = external installs
│   ├── personas/                     # Role prompts (architect, product, …) — SSOT
│   └── prompts/                      # Prompt fragments + Job_* scheduled runs — SSOT
├── .claude-plugin/marketplace.json    # Marketplace listing for plugins/ (this repo hosts its own)
├── plugins/                          # GENERATED hook plugin payloads (bundle-hooks): openthrottle, -workflow, -guards (Claude), -cursor, -cursor-guards, -codex. dist/ is gitignored; also the dev marketplace
├── .cursor/
│   ├── agents/                       # Cursor subagent definitions
│   ├── hooks/format.sh + hooks.json  # afterFileEdit → format.sh; other entries point at plugins/ stubs
│   ├── mcp.json              # openthrottle-mcp template
│   ├── settings.json, worktrees.json
├── .claude/
│   ├── settings.json                 # Permissions, MCP enablement
│   └── skills/                       # GENERATED fan-out: symlinks → .agents/skills/ (gitignored)
└── .vscode/
    ├── settings.json.default, extensions.json, launch.json, mcp.json
```

> **Skills are two-stage and fully generated.** `ot-skill-sync` builds `skills/*` → `.agents/skills/` (stage 1), then `.agents/skills/*` → each agent fan-out — currently `.claude/skills/` (stage 2). The dedicated `.cursor/skills` fan-out was **dropped**: Cursor reads `.agents/skills/` (and `.claude/skills/`) directly, so it needs no separate copy. Every supported CLI reads the `SKILL.md` standard and they differ only in which dirs they scan — Cursor, Grok Build, and Antigravity (`agy`) read `.agents/skills/` in-repo; Claude Code reads only `.claude/skills/`, which is why it is the fan-out target. The verified per-CLI matrix (including codex, which has no in-repo skills dir, and opencode's `.opencode/skill(s)`) lives in [`skills/ot-skill-sync/SKILL.md`](../../skills/ot-skill-sync/SKILL.md). **Never hand-edit** `.agents/skills/` or `.claude/skills/`.

> **Hooks reach child repositories differently from skills — do not copy the skills pattern.** The
> **`.claude/settings.json` must be strict JSON — no comments, no trailing commas.** Claude Code
> skips an unparseable settings file entirely, so a single `//` line silently disables every hook,
> permission and MCP setting in it. That stopped all in-repo skill capture from 2026-09-23 until it
> was found (OT plan `e7b74d81`). `monorepo:check-claude-config-json` gates it in `check:local` and
> CI. Put notes here instead: the empty `attribution.commit` / `attribution.pr` strings are
> deliberate — they turn off the harness's agent credit line, and setting them in
> `~/.claude/settings.json` applies the same everywhere.

> **Hooks reach child repositories differently from skills — do not copy the skills pattern.** The
> hooks ship **only** as the generated plugin payloads under `plugins/` — there are no per-tool hook
> bundles under `.claude/hooks/`, `.cursor/hooks/` or `.codex/hooks/`. This repo loads them in place
> (a generated dev marketplace for Claude, `.cursor/hooks.json` for Cursor); other repositories get
> them from a marketplace install of the `plugins-dist` branch or `--plugin-dir` at spawn time —
> **never** by writing into the target checkout. Skills had to be materialized into foreign repos
> because no CLI can load them from outside the working tree; every CLI we support can load hooks
> from outside it. See [hook-plugin-distribution.md](./hook-plugin-distribution.md) and
> [child-repo-hook-overlay.md](./child-repo-hook-overlay.md). `plugins/` is generated by
> `@openthrottle/agentic-hooks:bundle-hooks` and drift-gated (`dist/` is built by
> `pnpm run build:hooks`) — **never hand-edit** it either.

**Sync + drift gate:**

```bash
bash skills/ot-skill-sync/scripts/sync.sh          # (re)generate the layout (idempotent)
bash skills/ot-skill-sync/scripts/sync.sh --check  # validate without writing (CI drift gate)
```

**CI guard:** `pnpm nx run monorepo:check-agent-assets-ssot` runs `ot-skill-sync --check` (skill layout). CI materializes the generated skill symlinks with `sync.sh` before checking. Skill tags live on `project_skills` rows (GraphQL / `/skills` UI), not in a repo-root overlay file.

> **External server-scoped consumer — foreign-workspace skill injection.** Beyond the in-repo `sync.sh` fan-out above, the running OpenThrottle **server** projects the curated `skills/` SSOT (plus an opt-in per-user tier) INTO **foreign** repos it drives — any checkout outside this monorepo — so OT's skills are available there. It is **layered** (OT curated < personal < target repo, target wins on a name collision), **server-scoped** (materialized lazily on the first foreign run per repo, reused across runs, torn down on shutdown + a boot reaper for crashes), and **non-mutating**: injected entries go into the target's `.agents/skills` + `.claude/skills` as symlinks (host) / copies (container path bridge), hidden from `git status` via the target's **untracked `.git/info/exclude`** (never the tracked `.gitignore`) plus a per-repo ledger stored outside the repo — so the consumer's tracked files are never touched and `git status` stays clean at all times. This is a separate consumer of the same SSOT; it does not change `sync.sh`. Full design: [foreign-workspace-skill-injection.md](./foreign-workspace-skill-injection.md).

---

## 2. What's authored vs generated

| Concern            | Author here (SSOT)                                                                                                                                 | Generated (do not edit)                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| OT-owned skills    | `skills/<slug>/SKILL.md`                                                                                                                           | `.agents/skills/<slug>` (symlink), `.claude/skills/<slug>` |
| External skills    | `npx skills add <owner>/<repo> --skill <name> --agent universal` (→ `skills-lock.json` + a real dir in `.agents/skills/`)                          | `.claude/skills/<slug>`                                    |
| Personal skills    | `~/.openthrottle/skills/<slug>/SKILL.md` — **outside the repo**, per-user, never committed (`OPENTHROTTLE_PERSONAL_SKILLS_DIR` overrides the root) | `.agents/skills/<slug>` (symlink), `.claude/skills/<slug>` |
| Code style         | `AGENTS.md` § Code style + `docs/monorepo/code-style.md`                                                                                           | — (no generated view; read natively)                       |
| Personas / prompts | `.agents/personas/`, `.agents/prompts/`                                                                                                            | — (attached by hand or run as a scheduled job)             |
| Skill tags         | `project_skills.tags` (GraphQL / `/skills` UI; ingest does not write tags)                                                                         | —                                                          |

### Prompt filename conventions (`.agents/prompts/`)

Prompts are flat files in `.agents/prompts/`; the walker derives slug and title from the filename, so **no frontmatter is required**. The filename prefix says how the prompt is invoked:

| Prefix       | Meaning                                                                                                                                                                    | Example             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `Before_*`   | Lifecycle hook — injected before a run                                                                                                                                     | `Before_Joke.md`    |
| `After_*`    | Lifecycle hook — injected after a run                                                                                                                                      | `After_Fact.md`     |
| `Job_*`      | Standalone **scheduled run**, not a lifecycle hook. Self-contained; run by an OT scheduled job. Read-only on source; its only side effect is filing one OpenThrottle plan. | `Job_TestHealth.md` |
| `_template*` | Authoring template, skipped by the walker                                                                                                                                  | `_template.md`      |

`Job_*` prompts deliberately repeat their shared rules rather than referencing a common preamble — they must work standalone when handed to any agent CLI, and a broken cross-file reference in an unattended run costs more than the duplication.

**Editor-native** (not generated, not SSOT-mirrored): `.cursor/hooks.json`, local `.cursor/mcp.json` (from `mcp.json`), `.cursor/worktrees.json`, `.cursor/settings.json`. Older Nx Console releases may also write a generated Nx rule file to `.cursor/rules/nx-rules.mdc`; current ones only delete it as a legacy file or offer to migrate it to agent skills. That one path is gitignored, so it never shows up in `git status`.

**Customizing an external skill:** never edit the vendored copy — it stays 1:1 with upstream and a re-sync would overwrite it. Author a companion skill in `skills/`, or layer the OT-specific guidance in a doc that references it. Exemplar: [code-style.md § Frontend design](./code-style.md#frontend-design) overlays the vendored `frontend-design` skill. See [docs/Skills.md](../Skills.md).

### Claude Code: load `AGENTS.md` (global-only setting)

Claude Code reads `CLAUDE.md` natively but only loads a sibling `AGENTS.md` when the built-in `agents-md` plugin is told to. Without it, every `AGENTS.md` in this repo (root and per-folder) is silently ignored. The option is honoured **only in user-global settings** — a checked-in `.claude/settings.json` has no effect — so it cannot be committed and each contributor sets it once in `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json` if you set that variable). Merge this block in:

```json
{
  "pluginConfigs": {
    "agents-md@builtin": {
      "options": {
        "instructionFiles": "claude-md-and-agents-md"
      }
    }
  }
}
```

`./scripts/setup.sh` warns at the end when it is missing; run `pnpm run check:claude-settings` any time to re-check (add `-- --strict` to exit 1 on a miss). The check only reads the file and never edits it, and it is deliberately not part of `check:local` because it inspects a per-user file.

---

## 3. Where to edit (common tasks)

| I want to…                             | Do this                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add an **OT-owned skill**              | Create `skills/<slug>/SKILL.md`, run `sync.sh`. Tag the ingested record in `/skills` (not a JSON overlay)                                        |
| Try a **private skill** of your own    | `bash skills/ot-skill-sync/scripts/personal.sh new <slug>` — lands outside the repo, uncommittable; `promote <slug>` graduates it into `skills/` |
| Install an **external skill**          | `npx skills add <owner>/<repo> --skill <name> --agent universal`, run `sync.sh` (keep it 1:1)                                                    |
| **Customize** an external skill        | Author a companion skill/rule that references it — don't edit the vendored copy (see §2)                                                         |
| Change **TypeScript / JS style**       | `docs/monorepo/code-style.md` for the rationale, and `AGENTS.md` § Code style for the normative line                                             |
| Change **OT / GitHub rules**           | the skill that owns it: `skills/ot-plans/`, `skills/github-*/`                                                                                   |
| Change **plan run** behavior           | `skills/ot-loop/SKILL.md` § The loop and `docs/workflows/ot-loop-job.md`; the job code is `packages/openthrottle-agentic-loop`                   |
| Add a **persona**                      | `.agents/personas/<id>.md` from `_template.md`                                                                                                   |
| Configure **openthrottle-mcp** locally | Copy `.cursor/mcp.json` → `.cursor/mcp.json` (full guide: [mcp-registration.md](../openthrottle/mcp-registration.md))                            |
| Recreate generated links after clone   | `bash skills/ot-skill-sync/scripts/sync.sh`                                                                                                      |

---

## 4. Git tracking (summary)

| Tracked                                                                                  | Ignored / local                                                                                       |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `skills/**` (OT-owned bodies), `skills-lock.json`                                        | —                                                                                                     |
| `.agents/skills/<external-slug>/**` (real dirs — vendored, pinned by `skills-lock.json`) | `.agents/skills/<own-slug>` (symlinks — generated, regenerated by `sync.sh`)                          |
| `.agents/personas/`, `.agents/prompts/`                                                  | —                                                                                                     |
| `plugins/*/{hooks,bin}/` stubs, manifests, `hooks.json`, READMEs, dev marketplace        | `plugins/*/dist/` (esbuild bundles; `pnpm run build:hooks`)                                           |
| —                                                                                        | Cursor's own generated Nx rules directory (gitignored), `.cursor/mcp.json`, `.cursor/cli-config.json` |
| `.cursor/hooks.json`, `worktrees.json`, `settings.json`, `.cursor/mcp.json`              | `.claude/skills/` (generated fan-out), Claude `projects/` / `sessions/` / `settings.local.json`       |
| `.vscode/settings.json.default`                                                          | `.vscode/settings.json`, `CLAUDE.local.md`                                                            |

> The `.gitignore` "Managed by OpenThrottle ot-skill-sync" block ignores `.agents/skills/*` (the own-skill symlinks) and all of `.claude/skills/`, while un-ignoring `.agents/skills/*/` so vendored external-install directories stay tracked. CI regenerates the ignored symlinks with `sync.sh` before running the drift gate.
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
| **[skills/ot-skill-sync/SKILL.md](../../skills/ot-skill-sync/SKILL.md)** | The ot-skill-sync architecture, `sync.sh`/`--check`, ownership rules | Personas/prompts layout, code style           |
| **[docs/Skills.md](../Skills.md)**                                       | Skill adoption policy, installed set, skip-list                      | Physical folder tree                          |
| **[AGENTS.md](../../AGENTS.md)**                                         | Nx guidelines, skills index, plan runs, code style                   | Per-editor folder inventory                   |
| **[AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)**                  | What agents load: the rule set, generator commands, discoverability  | Physical folder tree                          |

When onboarding agents: point them at **[AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)** for _what to load_ and **this doc** for _where files live_. When changing behavior: author skills in `skills/` (or install external ones with the CLI) — never the generated trees — and change code style in `AGENTS.md` § Code style plus [code-style.md](./code-style.md).

## 7. Cross-agent parity

We aim to support **all** our agents/drivers across the board (antigravity, claude, codex, cursor, grok, opencode, plus VS Code): the same MCP servers and the same tracked permission policy, kept consistent. A change to one tool's MCP set or permission policy lands for every tool in the same PR, or the gap is recorded here. (The `gemini` driver was removed in PR #739.)

- **Source of truth and generator:** [`.agents/agent-config.json`](../../.agents/agent-config.json), fanned out by `pnpm exec tsx scripts/sync-agent-config.ts` (`--check` fails on drift). Edit that file, never the per-tool outputs. Schema, mapping tables and the generated-file list live in [agent-config-parity.md](./agent-config-parity.md); this section does not restate them.
- **Registration, tokens, launchers, per-editor config files:** [mcp-registration.md](../openthrottle/mcp-registration.md). **Hook support per CLI:** [agent-cli-hook-capability-matrix.md](./agent-cli-hook-capability-matrix.md).
- **Default-on servers:** `fetch`, `github`, `maestro`, `openthrottle-mcp`, `shadcn`. `openthrottle-mcp-docker` and `nx-mcp` are defined but **off by default everywhere**: emitted with `enabled: false` only where the tool has an off switch (`opencode.json`, `.codex/config.toml`) and omitted from the rest. `nx-mcp` stays off because the `nx-workspace` skill and Nx Console already cover it and it adds a process plus tool schemas to every session; opt in at user level.

### Capability matrix

Measured 2026-11-12 on claude 2.1.322, cursor-agent 2026.11.11, codex 0.167.0, opencode 1.19.5, grok 1.0.77, agy 1.5.7 (VS Code per its docs, not probed).

Legend: **P** = project level, committable. **U** = user-level only. **X** = unsupported. **F** = per-invocation flag only.

| Surface         | MCP config                                                                     | Enabled out of the gate, committable?                                                                                          | Permissions; can it deny `git push origin main` / `--force`?              | `./scripts/` launcher from a subdir                           | Attribution off at project level                    |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| **claude**      | P: `.mcp.json`                                                                 | P after trust (`enabledMcpjsonServers`; `-p` loads all)                                                                        | P: `.claude/settings.json`; yes (bypassable)                              | Works (cwd = repo root)                                       | P: `attribution` in settings                        |
| **cursor**      | P: `.cursor/mcp.json`                                                          | U/F: approval in `~/.cursor/projects/<slug>/`, or `--approve-mcps`                                                             | P: `.cursor/cli.json` (`permissions` only); yes, `Shell(git:push*main*)`  | Root only                                                     | U: `~/.cursor/cli-config.json`                      |
| **codex**       | P (trusted projects): `.codex/config.toml`                                     | P (trusted): `enabled` default true; trust is user-level, a worktree inherits its primary checkout's (provisioning records it) | P (trusted): `.codex/rules/*.rules`; partial, token prefixes only         | Unverified; set `cwd`                                         | P on paper: `commit_attribution`                    |
| **opencode**    | P: `opencode.json` `mcp`                                                       | P: `enabled: false` disables                                                                                                   | P: `permission.bash`; yes (last match wins)                               | Root only                                                     | X (n/a)                                             |
| **grok**        | P: `.grok/config.toml`; also reads `.mcp.json`                                 | P (trusted folder): user-level trust or `--trust`                                                                              | P (trusted): `.grok/config.toml`; also reads `.claude/settings.json`; yes | Root only                                                     | X                                                   |
| **antigravity** | P: workspace plugin `.agents/plugins/openthrottle/mcp_config.json` (agy 1.5.8) | P: loaded in live sessions; `agy mcp list` does not show it                                                                    | P: plugin `hooks.json` PreToolUse deny (`deny-rules.json`); yes, globs    | Works: rewritten to `../../../scripts/` (cwd = plugin folder) | X                                                   |
| **VS Code**     | P: `.vscode/mcp.json`                                                          | Partial: no enable field, per-user UI                                                                                          | Approval only: `chat.tools.terminal.autoApprove`; **cannot hard-deny**    | Works (`cwd` = workspace)                                     | P likely: `git.addAICoAuthor` (gitignored settings) |

### Cross-cutting findings

- **Relative `./scripts/…` launchers** work from a subdirectory only in Claude Code and VS Code. Cursor, OpenCode and Grok spawn with the session cwd, and Codex's behavior is undocumented, so a driver run from a subdir fails. Run from the checkout root.
- **Rule-based denies are bypassable** in every tool (`git -C . push`, `HEAD:main` refspecs, flag reordering). The `bash-guard` hooks and the Husky `pre-push` hook remain the real gate for pushes to `main` and force pushes.
- **Cursor `.cursor/cli.json` may hold only `permissions`.** Any other key (for example `attribution`) makes every `cursor-agent` run fail schema validation.
- **Codex project config and rules load only for trusted projects** (`[projects."<path>"] trust_level = "trusted"` in `~/.codex/config.toml`). Grok and interactive Claude sessions likewise gate repo MCP servers on a trusted folder.
- **Grok reads `.mcp.json` and `.claude/settings.json` natively**, so it needs no file of its own; a user-level `~/.claude.json` entry shadows the repo's `openthrottle-mcp`.
- **Antigravity's deny is a hook, not a rule.** agy's own `command(...)` rules are token prefixes with no globs, so the workspace plugin enforces the SSOT deny globs with a PreToolUse hook instead (agy 1.5.8, OT plan `1e74c1eb`).
- **Gaps, not fixable by a committed file:** antigravity (no `agy mcp list` visibility, no generated allows), VS Code (no deny), Cursor MCP approval. Recorded in [agent-config-parity.md § Gaps](./agent-config-parity.md#gaps-what-a-tool-cannot-express).

### Skill-usage telemetry per agent

State after OT plan `8f040d3a` (2026-11-24). **Capture** records a skill start from a hook;
**deliberate report** is `skill-usage-outcome.cjs`, run by a skill at its finish line, which claims
that start (the only source of `success` / `error` and of a duration); **session-end resolution**
turns unclaimed starts into `session_ended`; the **heartbeat** says the agent is instrumented at
all. Measurements, versions and payload shapes: [agent-cli-hook-capability-matrix.md](./agent-cli-hook-capability-matrix.md).

| Agent           | Capture                                                                   | Deliberate report (outcome + duration)                                                                                            | Session-end resolution | Heartbeat      |
| --------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------- |
| **claude**      | `PreToolUse(Skill)` + `UserPromptExpansion`                               | **yes**, via `CLAUDE_CODE_SESSION_ID`                                                                                             | `SessionEnd`           | `SessionStart` |
| **codex**       | `PreToolUse` `Bash` `cat` of a `SKILL.md` (`skill_read`) + slash commands | **yes**, via `CODEX_SESSION_ID` (a skill loaded some other way than a bare `cat` has no start, so its report carries no duration) | `SessionEnd`           | `SessionStart` |
| **cursor**      | `preToolUse` `Read` of a `SKILL.md` (`skill_read`)                        | **yes**, via `CURSOR_CONVERSATION_ID` (verified live on 2026.11.13)                                                               | `sessionEnd`           | `sessionStart` |
| **antigravity** | none (unmeasured)                                                         | none; no shell marker yet, so a report from its shell can still be stamped `claude-code`                                          | none                   | `SessionStart` |
| **gemini-cli**  | none (`BeforeTool` `activate_skill` exists, not adapted)                  | **stands down**: no session id in its shell (`GEMINI_CLI=1` only)                                                                 | none                   | none           |
| **opencode**    | none (`skill` tool + plugin events exist, not adapted)                    | **stands down**: no session id in its shell (`OPENCODE=1` only)                                                                   | none                   | none           |
| **grok**        | none (no `Skill` tool)                                                    | none                                                                                                                              | none                   | none           |

**Which agents can show Outcomes and Avg duration on `/skills`:** Claude Code and Cursor, for every
skill that reports; Codex, for every skill it loads with a slash command or a bare `cat` of its `SKILL.md`. Every other agent shows no
measured outcome, which is the honest reading. Two caveats: the reporter is found through the
repo-relative fallback in each skill's one-liner, so outside this repo it depends on the plugin's
`bin/` being on the shell PATH, which is verified for Claude Code only; and a Cursor start is the
weaker `SKILL.md`-read signal. The remaining agents are OT plan `4dff4f7e`.

### Per-checkout registrations ship with their removal

Some provisioning writes agent state _outside_ the checkout, in a user-global file keyed by the checkout's path. Removing the directory does not take that state with it, so it leaks once per worktree ever created. Before this rule, 51 of 53 Claude entries per plugin (153 in total) pointed at deleted worktrees.

**The rule:** a per-checkout agent registration ships with its removal, as one entry in [`scripts/utils/agent-checkout-registrations.ts`](../../scripts/utils/agent-checkout-registrations.ts). An entry holds `register` (run by `scripts/setup.ts` and worktree provisioning), `unregister` (run by worktree teardown before the directory goes), `listOrphans` (read by the sweep) and its own opt-out env. Adding a registration means adding an entry, and both halves land in the same PR. Every step is fail-open and goes through the agent's own CLI, never a hand-edit of its registry file, because concurrent sessions write those files. `pnpm worktree:prune-agents [--dry-run]` (also run best-effort by `setup.ts`) catches checkouts removed without teardown: a bare `git worktree remove`, the plan-run reaper, or `rm -rf`.

What provisioning writes per agent (audited 2026-11-15):

| Agent                           | What provisioning writes                                                                                                                                          | Keyed per worktree?                  | On the registry?                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| claude                          | `openthrottle`, `openthrottle-workflow`, `openthrottle-guards` from `openthrottle-dev` at `--scope local`, recorded in `~/.claude/plugins/installed_plugins.json` | yes (`projectPath`)                  | **yes**; details in [hook-plugin-distribution.md §5](./hook-plugin-distribution.md#5-dogfooding--this-repo-consumes-its-own-plugins) |
| codex                           | one `[projects."<primary>"] trust_level` in `~/.codex/config.toml` (`scripts/utils/codex-trust.ts`)                                                               | no: primary checkout only, by design | **no, deliberately.** One entry covers every worktree, so a worktree's teardown must never remove it                                 |
| antigravity                     | nothing user-global; the workspace plugin is committed at `.agents/plugins/openthrottle/`                                                                         | n/a                                  | n/a                                                                                                                                  |
| cursor, opencode, grok, VS Code | nothing; their config is committed in-repo                                                                                                                        | n/a                                  | n/a                                                                                                                                  |

**Out of scope:** state an agent CLI writes _itself_ when it runs in a directory, such as `~/.cursor/projects/<slug>/` (transcripts and MCP approvals), `~/.claude/projects/<slug>/` and the project entries in `~/.claude.json`. That state holds user history and belongs to each tool, so deleting it is a separate decision with its own risk.
