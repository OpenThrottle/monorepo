---
name: ot-onboarding
description: >-
  Guided orientation tour of OpenThrottle for a new person or a fresh session,
  ending in a first real plan. USE WHEN running /ot-onboarding, or the user says
  "onboard me", "I'm new here", "where do I start", "what is this repo", "how do
  plans/tasks work here", or asks you to remember that plans belong in OT rather
  than in Markdown. Gates on an openthrottle-mcp health check, then persists the
  OT-only plan rule to durable memory and reports guidance that contradicts it.
  Not for a specific subsystem — see ot-stack.
---

# 🚪 OpenThrottle onboarding — start here

Your job when this skill fires is to **onboard the user onto OpenThrottle**: get their environment verified, then walk them through just enough of the system to be productive, pointing at the deeper skills and docs for detail. Orient and link — do **not** re-document CLAUDE.md, MONOREPO.md, or CONTRIBUTING.md.

Work the sections in order. Sections 1 and 2 are **gates**: if the OT MCP isn't healthy, stop and fix that before touring anything else — and once it is, make the OT-only plan rule durable before moving on.

---

## 1. First: verify the OpenThrottle MCP (health gate)

Everything in OpenThrottle flows through the **`openthrottle-mcp`** server — plans, tasks, notes, activity, and semantic search all live behind it. **Nothing else in this skill matters until it's healthy.** Do this gate first, and if it fails, stop and fix it — never silently tour on without a working MCP.

**Step 1 — is the server even registered?** Confirm the current agent has an `openthrottle-mcp` entry. In this repo it's the `openthrottle-mcp` key in [`.mcp.json`](https://github.com/openthrottle/monorepo/blob/main/.mcp.json) (launches [`scripts/run-openthrottle-mcp.sh`](https://github.com/openthrottle/monorepo/blob/main/scripts/run-openthrottle-mcp.sh)); Cursor reads `.cursor/mcp.json`. If the agent lists **no** `openthrottle-mcp` tools at all, the launcher is usually missing its config flag or the token env — see the auth runbook below.

**Step 2 — run `health` (and only `health`).** Call the tiny **`health`** tool. It returns `{ api, database, redis, websocket }`; all four should read `ok`:

```json
{
  "serverHealth": {
    "api": "ok",
    "database": "ok",
    "redis": "ok",
    "websocket": "ok"
  }
}
```

> ⚠️ **Use `health`, never `list_sources` as your probe.** `health` is a few bytes; `list_sources` returns ~67k characters and will blow out the context window. Reach for `list_sources` / `semantic_search` only when you actually need knowledge-base content.

**Step 3 — interpret and fail loudly.** If `health` errors or any facet is not `ok`, **report the exact failure and the fix — do not proceed to section 2.**

| Symptom                                        | Likely cause                                                                                                      | Remediation                                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Agent lists **no** `openthrottle-mcp` tools    | Launcher missing its `-c` config flag, or `OPENTHROTTLE_MCP_AUTH_TOKEN` not exported                              | Re-check the `.mcp.json` entry; run `pnpm exec tsx scripts/verify-openthrottle-mcp-env.ts` to confirm the env resolves    |
| Tools present but calls **401 / unauthorized** | Missing/expired `OPENTHROTTLE_MCP_AUTH_TOKEN` (use a long-lived `ot_sa_…` service-account token, not a human JWT) | `pnpm database:bootstrap-service-accounts` (self-heals a missing key) then `pnpm check:bootstrap-secrets`; reload the MCP |
| `health` reports `database`/`redis` not `ok`   | Postgres/Redis not up, or migrations pending                                                                      | `pnpm run database:start` then `pnpm run database:migrate`                                                                |
| Calls throw **"fetch failed"** in a worktree   | Tools pinned to a dead/alternate server port                                                                      | Point at the live server, or use the stdio/curl fallback below                                                            |

**Setup from zero.** If this is a fresh checkout, `./scripts/setup.sh` provisions the environment and seeds the service accounts; it ends by running `pnpm check:bootstrap-secrets` which fails loudly if any required token is missing.

**Runbooks (authoritative — read these, don't guess):**

- Auth, token types, and rotation → [`packages/openthrottle-mcp/docs/AUTH.md`](https://github.com/openthrottle/monorepo/blob/main/packages/openthrottle-mcp/docs/AUTH.md)
- MCP registration / the config block → [`docs/openthrottle/mcp-registration.md`](https://github.com/openthrottle/monorepo/blob/main/docs/openthrottle/mcp-registration.md)
- Env preflight → [`scripts/verify-openthrottle-mcp-env.ts`](https://github.com/openthrottle/monorepo/blob/main/scripts/verify-openthrottle-mcp-env.ts)
- **Stdio fallback:** drive [`scripts/run-openthrottle-mcp.sh`](https://github.com/openthrottle/monorepo/blob/main/scripts/run-openthrottle-mcp.sh) directly over stdio (export `API_URL` / `API_URL_INTERNAL` from the server app URL) when the registered server is unreachable.
- **Curl fallback:** hit the GraphQL endpoint directly with your `Authorization: Bearer <token>` when the pinned MCP port is dead — enough to unblock while you fix the registration.

Only once `health` is green across all four facets do you continue.

---

## 2. Second: make the OT-only rule durable (agent gate)

This section is **work for you, the agent running this skill** — not reading for the user. The
previous gate proved the MCP is reachable; this one makes sure the rule that governs it survives
past this session.

**The rule, in the exact form to persist:**

> Plans and tasks are created and updated in OpenThrottle **only**, via the `openthrottle-mcp` tools
> (`create_plan`, `create_task`, `update_task`, …). Never write a plan, task, spec, PRD or task list
> to a Markdown file. If the MCP is unavailable, fail loudly and report the error — never fall back
> to a file.

### First, write the rule where it survives

Onboarding runs once; without this the rule evaporates
when the session ends. Map the intent onto whatever your own host actually provides — you know which
agent you are, so pick your row:

| Host agent          | Where to persist it                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Claude Code         | the user-global memory store (`~/.claude/projects/<project>/memory/` + its `MEMORY.md` index) |
| Codex               | `$CODEX_HOME/AGENTS.md` (usually `~/.codex/AGENTS.md`)                                        |
| Gemini CLI          | `~/.gemini/GEMINI.md`                                                                         |
| Grok Build          | its own memory store — `grok memory` (a command, not a file)                                  |
| OpenCode            | `~/.config/opencode/AGENTS.md`                                                                |
| Cursor, Antigravity | **no writable surface** — use the fallback below                                              |

Two hard constraints on where it goes:

- **Prefer a user-global surface.** A repo-tracked file (`CLAUDE.md`, `AGENTS.md`, `.agents/rules/*`)
  is a **code change** — it belongs in a PR, never as a silent side effect of onboarding.
- **If your host has no writable memory surface** — or you are unsure it has one — do **not** invent
  a file. State the rule back to the user verbatim and tell them where to paste it by hand (their
  agent's User Rules / global instructions). This is the honest answer for roughly a third of the
  hosts OpenThrottle supports, not an edge case.

**Confirm the write; never claim it silently.** Report the exact path you wrote (or the command you
ran) and quote the line back. If the write failed, say so and fall back to the paste-by-hand path.

### Then sweep out the guidance that fights it

Persisting the rule is only half the job — the host may already be carrying instructions that say
the opposite. Work this as **search → report → ask → edit**, and never collapse those four steps.

**Search.** Grep the agent-facing guidance for instructions to put a plan on disk:

```bash
grep -rniE 'plans/NNN|plans/README\.md|write (the |a )?(plan|prd|spec)|plan file|docs/plans|(plan|prd|spec|task list)[^.]{0,40}\.md' \
  skills/ .agents/ AGENTS.md CLAUDE.md GEMINI.md docs/ 2>/dev/null \
  | grep -viE "never|not as|instead of|do not|don't|rather than|fail loudly"
```

That negative filter matters: without it the hits that _state_ the rule drown out the ones that
break it. Even so, expect roughly fifty hits in this repo and **triage before reporting** — this
skill's own file, `ot-plans`, and the `docs/openthrottle/*` guides all mention plans and Markdown in
the same breath while saying the right thing. A hit only counts if it tells an agent to _put a plan
on disk_. Sweep your own memory/rules store the same way — and remember `.agents/skills/` holds
**external** skills installed via `npx skills add`, which are the likeliest offenders because nobody
here wrote them.

**Report.** Show the user **every** hit as `file:line` with the offending text quoted. Never edit
anything found this way before showing it. A known live example, so you know what a real hit looks
like: the vendored `improve` skill instructs writing plans to `plans/NNN-short-slug.md` with a
`plans/README.md` index — directly against the rule.

**Ask.** Get explicit confirmation before changing anything outside your own memory store.

- Your own memory/rules store — fix it yourself, then say what you changed.
- **Repo-tracked files** (`CLAUDE.md`, `AGENTS.md`, `.agents/rules/*`, another skill) — a **code
  change**. It belongs in a commit and a PR, not a silent side effect of onboarding. Say that to the
  user rather than just editing.
- **Generated skill dirs are never edited directly.** A fix to an authored skill goes in `skills/`
  and is re-synced with [`ot-skill-sync`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-skill-sync/SKILL.md).
  A **vendored** external skill (a real dir in `.agents/skills/`, hash-pinned in `skills-lock.json`)
  cannot be hand-fixed at all — editing it breaks the lock. Report it and propose an OT-side override
  instead.

**Edit.** Only on confirmation. Then re-state exactly what changed and where.

**Anything found but declined stays on the record.** Surface it again in the section 7 wrap-up, named
by `file:line` — the user needs to know the rule is still being contradicted somewhere. See also the
troubleshooting row in
[`docs/openthrottle/first-time-onboarding.md`](https://github.com/openthrottle/monorepo/blob/main/docs/openthrottle/first-time-onboarding.md)
for what to do when an agent tries this mid-task.

Deep dive on the lifecycle this rule protects: [`ot-plans`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md).

---

## 3. System basics — the mental model

**The one rule that shapes everything** is the one section 2 just made durable: plans and tasks are the single source of truth and they live in OpenThrottle (OT), never on disk. What that buys you here is traceability — the same MCP tools that create the rows (`create_plan`, `create_task`, `update_task`, …) give every row an id, and you thread it back to git with `Plan-Id:` / `Task-Id:` commit footers. The [`ot-plans`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md) skill is the deep dive here.

**The monorepo shape** (Nx + pnpm, Node ≥ 22, pnpm only):

| Folder          | What lives there                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applications/` | Deployable apps — `openthrottle-server` (NestJS code-first GraphQL API) and the React Router apps `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, `openthrottle-website` |
| `packages/`     | Shared libs — `@openthrottle/nestjs-*` server modules, `@openthrottle/react-router-*` UI/client libs, `openthrottle-agentic-*` Ralph tooling, `openthrottle-mcp`                               |
| `tools/`        | Nx plugins, `@tools/generators` (scaffolding), `@tools/workflows` (Ralph CLI)                                                                                                                  |
| `databases/`    | Postgres schema, migrations, local DB scripts                                                                                                                                                  |

Everything runs **through Nx, prefixed with pnpm** (`pnpm nx …`) — never the underlying tooling directly.

**Bring the system up:**

```bash
./scripts/setup.sh                        # one-shot environment setup/reset (also seeds the default login user)
pnpm run database:start                   # Postgres + Redis via docker compose
pnpm nx run openthrottle-server:dev       # NestJS GraphQL API (auto-applies pending migrations first)
pnpm nx run openthrottle-developer:dev    # Developer UI (React Router)
```

The server auto-applies pending migrations on boot and fails fast if Postgres is down, so start it after `database:start`.

**Don't duplicate — go read the source of truth:**

- [`CLAUDE.md`](https://github.com/openthrottle/monorepo/blob/main/CLAUDE.md) — commands, code style, generators-first, git/agent rules (the operating manual)
- [`MONOREPO.md`](https://github.com/openthrottle/monorepo/blob/main/MONOREPO.md) — how the Nx + pnpm workspace is organized
- [`AGENTS.md`](https://github.com/openthrottle/monorepo/blob/main/AGENTS.md) — the tiered agent-facing guidance (per-project `AGENTS.md` files sit next to the code they describe)
- [`CONTRIBUTING.md`](https://github.com/openthrottle/monorepo/blob/main/CONTRIBUTING.md) — contribution conventions, incl. the source-first React Router packages
- [`databases/README.md`](https://github.com/openthrottle/monorepo/blob/main/databases/README.md) — schema, migrations, DB setup

---

## 4. Keyboard shortcuts + everyday workflows

These are the levers a newcomer should know exist. You don't need to master them now — just recognize the name so you know what to reach for.

**Agent keyboard shortcuts.** Your agent (Claude Code / Cursor) has its own keybindings and slash-command palette. In Claude Code, customize them in `~/.claude/keybindings.json` (the `keybindings-help` skill walks you through rebinding keys and chord shortcuts). Harness dialogs like `/config` and `/permissions` are only available in an interactive terminal session.

**Everyday workflows** — one line each on when you'd reach for it, with the deeper skill to read:

| Lever                            | Reach for it when…                                                                                                                                               | Deeper skill                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **`/loop`**                      | you want a prompt or slash command to run on a repeating interval (poll a deploy, keep grinding a task list)                                                     | built-in `loop` skill                                                                             |
| **Ralph loop** (`/agents-ralph`) | you have an OT plan and want to execute its tasks one at a time — IN_PROGRESS → work → validate → COMPLETED → commit — with `Plan-Id:` / `Task-Id:` traceability | [`agents-ralph`](https://github.com/openthrottle/monorepo/blob/main/skills/agents-ralph/SKILL.md) |
| **`ot-loop`**                    | drive that same per-task loop over a plan interactively via `/loop`                                                                                              | [`ot-loop`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-loop/SKILL.md)           |

**The `/github/*` workflow skills** — the portable git/PR toolkit (one job each):

- [`github-commit`](https://github.com/openthrottle/monorepo/blob/main/skills/github-commit/SKILL.md) — write a conventional-commit message from the diff
- [`github-pull-request`](https://github.com/openthrottle/monorepo/blob/main/skills/github-pull-request/SKILL.md) — create or update a template-compliant PR
- [`github-squash`](https://github.com/openthrottle/monorepo/blob/main/skills/github-squash/SKILL.md) — squash the branch to a single commit before merge

> **Guard rails that never bend:** never push to `main`, never `--no-verify` or bypass Husky hooks, and get human confirmation before any rebase or force-push. Commits are Conventional Commits (commitlint + Husky enforce it) — and **never** add `Co-authored-by`/attribution lines; only the sanctioned footers (`BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`).

---

## 5. How skills work here + the catalog

Skills are packaged, reusable know-how an agent pulls in to do a task "the OpenThrottle way." There are **two homes**, and the distinction matters:

- **`skills/` — authored, repo-specific skills.** Hand-written, committed, PR-reviewed (this skill lives here). Any OpenThrottle repo can have its own `skills/`.
- **`.agents/skills/` — the merged, managed single-source-of-truth view** that most universal agent tools read natively. **Real directories** here are _external_ skills installed via `npx skills add … --agent universal` and tracked in [`skills-lock.json`](https://github.com/openthrottle/monorepo/blob/main/skills-lock.json) — never hand-edit them. **Symlinks** here are this repo's `skills/*`, generated by the sync.

**Fan-out is automated — never hand-edit generated dirs.** The [`ot-skill-sync`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-skill-sync/SKILL.md) skill builds the whole layout: it symlinks authored `skills/*` into `.agents/skills/`, then fans them out to the agent folders that need their own copy (e.g. `.claude/skills/` for Claude Code). It also owns the generated-symlink `.gitignore` and ships a `--check` mode that CI runs as the **SSOT drift gate**. **Always run `ot-skill-sync` after editing or adding a skill.**

**Invoking a skill.** Type `/<skill-name>` (e.g. `/ot-onboarding`), or let the agent trigger it via the Skill tool when your request matches the skill's `USE WHEN` description. That description is what makes a skill discoverable — write it as triggers, not prose.

**Know these first** (a newcomer's core four):

| Skill                                                                                               | One-liner                                                                                 |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`ot-plans`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md)           | Plans/tasks in OT via the MCP — the SSOT rules, lifecycle, and git↔OT traceability        |
| [`ot-generators`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-generators/SKILL.md) | Scaffold new code with `@tools/generators` (generators-first, `NX_ISOLATE_PLUGINS=false`) |
| [`ot-folders`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-folders/SKILL.md)       | Where new code goes, how to name it, and how to keep it tidy                              |
| [`ot-skill-sync`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-skill-sync/SKILL.md) | Install/fan-out/validate the skills layout in any repo                                    |

Full catalog and the install CLI: [`skills/README.md`](https://github.com/openthrottle/monorepo/blob/main/skills/README.md) · [`skills/AGENTS.md`](https://github.com/openthrottle/monorepo/blob/main/skills/AGENTS.md) · [`docs/Skills.md`](https://github.com/openthrottle/monorepo/blob/main/docs/Skills.md).

---

## 6. Your first plan — do one lap

Reading about plans is not the same as watching one appear. Do this once, now.

1. **Open the agent you actually use.** OpenThrottle drives several — Claude Code, Cursor, Codex,
   Gemini, Grok, OpenCode, Antigravity — and any of them can author a plan; the deep links a
   workspace offers are configured per user under `/settings/workspace`.
2. **Open an OT-enabled folder.** That means a **registered checkout** — one of your own repositories
   OpenThrottle knows about (`/settings/repositories`), so a plan authored from that folder links back
   to it instead of landing on the monorepo root. You are in one if you registered it; the resolution
   rules (deepest containing checkout wins, stdio-only capture) are in
   [authoring-plans-via-mcp.md](https://github.com/openthrottle/monorepo/blob/main/docs/openthrottle/authoring-plans-via-mcp.md).
3. **Give it this prompt, verbatim:**

   ```text
   Create a new plan. Review the repositories root README.md for accuracy and a general content refresh/update. If one does not exist we should create one.
   ```

   It is deliberately mundane: no domain context needed, safe in any repo, and the output is a
   genuinely useful plan. Once you have seen it work, substitute your own real task — the shape of
   the request is what matters, not this particular chore.

4. **What success looks like.** The agent calls `create_plan` and `create_task` — **tool calls, not
   file writes**. A plan appears in OT with tasks under it, and you can open it in the Developer UI
   and see the same rows. Nothing new shows up in `git status`.

5. **The giveaway failure.** If the agent instead offers to write you a Markdown plan — `docs/plans/…`,
   `plans/001-readme-refresh.md`, anything on disk — **the rule did not stick.** Go back to section 2:
   either the memory write did not land, or the sweep found a conflict that is still winning. Say no,
   and have it create the plan through the MCP.

---

## 7. Next steps

You're oriented, and you've made one plan. What to do from here:

1. **Confirm both gates are green** — `health` returns `ok` for all four facets (section 1), and the OT-only rule is persisted somewhere durable (section 2). If not, fix those first.
   - **Name any conflict you found and did not fix**, by `file:line`. A declined conflict is not a closed one — the rule is still being contradicted there.
2. **Bring the system up** — `./scripts/setup.sh` (fresh checkout) → `pnpm run database:start` → `pnpm nx run openthrottle-server:dev` → `pnpm nx run openthrottle-developer:dev` (section 3).
3. **Skim the operating manual** — [`CLAUDE.md`](https://github.com/openthrottle/monorepo/blob/main/CLAUDE.md) for commands, code style, and the generators-first rule.
4. **Run the lap in section 6** if you skipped it — one real plan teaches more than the rest of this tour.
5. **Pick the skill for your first task:**
   - Creating/working plans & tasks → [`ot-plans`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md), then execute with [`agents-ralph`](https://github.com/openthrottle/monorepo/blob/main/skills/agents-ralph/SKILL.md).
   - Adding a component/route/service/package → [`ot-generators`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-generators/SKILL.md) (generators before hand-writing).
   - Working in the NestJS/GraphQL server or a React Router app → [`ot-stack`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-stack/SKILL.md).
   - Shipping the change → `pnpm run worktree:new <name>` → [`github-commit`](https://github.com/openthrottle/monorepo/blob/main/skills/github-commit/SKILL.md) → [`github-pull-request`](https://github.com/openthrottle/monorepo/blob/main/skills/github-pull-request/SKILL.md).

When in doubt, ask the agent to pull in the matching skill — that's the OpenThrottle way.
