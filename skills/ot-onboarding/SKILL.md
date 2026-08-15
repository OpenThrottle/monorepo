---
name: ot-onboarding
description: >-
  The front-door orientation skill for OpenThrottle — the "kitchen sink" on-ramp
  a new person (or a fresh agent session) invokes first. USE WHEN running
  /ot-onboarding, or the user says "onboard me", "get me set up on OpenThrottle",
  "I'm new here", "OpenThrottle basics", "where do I start", "what is this repo",
  "how do plans/tasks work here", or otherwise needs a guided tour of the system.
  Verifies the openthrottle-mcp server is installed and healthy (fails loudly with
  the exact fix if not), then teaches the mental model, monorepo shape, dev
  servers, keyboard shortcuts, everyday workflows (/loop, Workflow, Ralph,
  /github/*), and how the skill catalog works — orienting and linking, never
  re-documenting CLAUDE.md / MONOREPO.md.
---

# 🚪 OpenThrottle onboarding — start here

Your job when this skill fires is to **onboard the user onto OpenThrottle**: get their environment verified, then walk them through just enough of the system to be productive, pointing at the deeper skills and docs for detail. Orient and link — do **not** re-document CLAUDE.md, MONOREPO.md, or CONTRIBUTING.md.

Work the sections in order. Section 1 is a **gate**: if the OT MCP isn't healthy, stop and fix that before touring anything else.

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
| Agent lists **no** `openthrottle-mcp` tools    | Launcher missing its `-c` config flag, or `OPENTHROTTLE_MCP_AUTH_TOKEN` not exported                              | Re-check the `.mcp.json` entry; run `./scripts/verify-openthrottle-mcp-env.sh` to confirm the env resolves                |
| Tools present but calls **401 / unauthorized** | Missing/expired `OPENTHROTTLE_MCP_AUTH_TOKEN` (use a long-lived `ot_sa_…` service-account token, not a human JWT) | `pnpm database:bootstrap-service-accounts` (self-heals a missing key) then `pnpm check:bootstrap-secrets`; reload the MCP |
| `health` reports `database`/`redis` not `ok`   | Postgres/Redis not up, or migrations pending                                                                      | `pnpm run database:start` then `pnpm run database:migrate`                                                                |
| Calls throw **"fetch failed"** in a worktree   | Tools pinned to a dead/alternate server port                                                                      | Point at the live server, or use the stdio/curl fallback below                                                            |

**Setup from zero.** If this is a fresh checkout, `./scripts/setup.sh` provisions the environment and seeds the service accounts; it ends by running `pnpm check:bootstrap-secrets` which fails loudly if any required token is missing.

**Runbooks (authoritative — read these, don't guess):**

- Auth, token types, and rotation → [`packages/openthrottle-mcp/docs/AUTH.md`](https://github.com/openthrottle/monorepo/blob/main/packages/openthrottle-mcp/docs/AUTH.md)
- MCP registration / the config block → [`docs/openthrottle/mcp-registration.md`](https://github.com/openthrottle/monorepo/blob/main/docs/openthrottle/mcp-registration.md)
- Env preflight → [`scripts/verify-openthrottle-mcp-env.sh`](https://github.com/openthrottle/monorepo/blob/main/scripts/verify-openthrottle-mcp-env.sh)
- **Stdio fallback:** drive [`scripts/run-openthrottle-mcp.sh`](https://github.com/openthrottle/monorepo/blob/main/scripts/run-openthrottle-mcp.sh) directly over stdio (export `API_URL` / `API_URL_INTERNAL` from the server app URL) when the registered server is unreachable.
- **Curl fallback:** hit the GraphQL endpoint directly with your `Authorization: Bearer <token>` when the pinned MCP port is dead — enough to unblock while you fix the registration.

Only once `health` is green across all four facets do you continue.

---

## 2. System basics — the mental model

**The one rule that shapes everything: plans and tasks are the single source of truth, and they live in OpenThrottle (OT) via the `openthrottle-mcp` server — never as Markdown under `docs/`.** You create and move them with MCP tools (`create_plan`, `create_task`, `update_task`, …), and you thread traceability back to git with `Plan-Id:` / `Task-Id:` commit footers. If the MCP is ever unavailable, **fail loudly** — do not fall back to writing a plan file. The [`ot-plans`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md) skill is the deep dive here.

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

## 3. Keyboard shortcuts + everyday workflows

These are the levers a newcomer should know exist. You don't need to master them now — just recognize the name so you know what to reach for.

**Agent keyboard shortcuts.** Your agent (Claude Code / Cursor) has its own keybindings and slash-command palette. In Claude Code, customize them in `~/.claude/keybindings.json` (the `keybindings-help` skill walks you through rebinding keys and chord shortcuts). Harness dialogs like `/config` and `/permissions` are only available in an interactive terminal session.

**Everyday workflows** — one line each on when you'd reach for it, with the deeper skill to read:

| Lever                                    | Reach for it when…                                                                                                                                               | Deeper skill                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **`/loop`**                              | you want a prompt or slash command to run on a repeating interval (poll a deploy, keep grinding a task list)                                                     | built-in `loop` skill                                                                                                       |
| **Workflow** (multi-agent orchestration) | one context can't hold the work — fan out many subagents to be comprehensive, or verify adversarially before committing                                          | [`ot-workflow-orchestration`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-workflow-orchestration/SKILL.md) |
| **Ralph loop** (`/agents-ralph`)         | you have an OT plan and want to execute its tasks one at a time — IN_PROGRESS → work → validate → COMPLETED → commit — with `Plan-Id:` / `Task-Id:` traceability | [`agents-ralph`](https://github.com/openthrottle/monorepo/blob/main/skills/agents-ralph/SKILL.md)                           |
| **`ot-plan-loop`**                       | drive that same per-task loop over a plan interactively via `/loop`                                                                                              | [`ot-plan-loop`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plan-loop/SKILL.md)                           |

**The `/github/*` workflow skills** — the portable git/PR toolkit (one job each):

- [`github-branch`](https://github.com/openthrottle/monorepo/blob/main/skills/github-branch/SKILL.md) — fork a new branch of work
- [`github-commit`](https://github.com/openthrottle/monorepo/blob/main/skills/github-commit/SKILL.md) — write a conventional-commit message from the diff
- [`github-pull-request`](https://github.com/openthrottle/monorepo/blob/main/skills/github-pull-request/SKILL.md) — create or update a template-compliant PR
- [`github-squash`](https://github.com/openthrottle/monorepo/blob/main/skills/github-squash/SKILL.md) — squash the branch to a single commit before merge

> **Guard rails that never bend:** never push to `main`, never `--no-verify` or bypass Husky hooks, and get human confirmation before any rebase or force-push. Commits are Conventional Commits (commitlint + Husky enforce it) — and **never** add `Co-authored-by`/attribution lines; only the sanctioned footers (`BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`).

---

## 4. How skills work here + the catalog

Skills are packaged, reusable know-how an agent pulls in to do a task "the OpenThrottle way." There are **two homes**, and the distinction matters:

- **`skills/` — authored, repo-specific skills.** Hand-written, committed, PR-reviewed (this skill lives here). Any OpenThrottle repo can have its own `skills/`.
- **`.agents/skills/` — the merged, managed single-source-of-truth view** that most universal agent tools read natively. **Real directories** here are _external_ skills installed via `npx skills add … --agent universal` and tracked in [`skills-lock.json`](https://github.com/openthrottle/monorepo/blob/main/skills-lock.json) — never hand-edit them. **Symlinks** here are this repo's `skills/*`, generated by the sync.

**Fan-out is automated — never hand-edit generated dirs.** The [`skill-sync`](https://github.com/openthrottle/monorepo/blob/main/skills/skill-sync/SKILL.md) skill builds the whole layout: it symlinks authored `skills/*` into `.agents/skills/`, then fans them out to the agent folders that need their own copy (e.g. `.claude/skills/` for Claude Code). It also owns the generated-symlink `.gitignore` and ships a `--check` mode that CI runs as the **SSOT drift gate**. **Always run `skill-sync` after editing or adding a skill.**

**Invoking a skill.** Type `/<skill-name>` (e.g. `/ot-onboarding`), or let the agent trigger it via the Skill tool when your request matches the skill's `USE WHEN` description. That description is what makes a skill discoverable — write it as triggers, not prose.

**Know these first** (a newcomer's core four):

| Skill                                                                                                                   | One-liner                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`ot-plans`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md)                               | Plans/tasks in OT via the MCP — the SSOT rules, lifecycle, and git↔OT traceability        |
| [`openthrottle-generators`](https://github.com/openthrottle/monorepo/blob/main/skills/openthrottle-generators/SKILL.md) | Scaffold new code with `@tools/generators` (generators-first, `NX_ISOLATE_PLUGINS=false`) |
| [`openthrottle-folders`](https://github.com/openthrottle/monorepo/blob/main/skills/openthrottle-folders/SKILL.md)       | Where new code goes, how to name it, and how to keep it tidy                              |
| [`skill-sync`](https://github.com/openthrottle/monorepo/blob/main/skills/skill-sync/SKILL.md)                           | Install/fan-out/validate the skills layout in any repo                                    |

Full catalog and the install CLI: [`skills/README.md`](https://github.com/openthrottle/monorepo/blob/main/skills/README.md) · [`skills/AGENTS.md`](https://github.com/openthrottle/monorepo/blob/main/skills/AGENTS.md) · [`docs/Skills.md`](https://github.com/openthrottle/monorepo/blob/main/docs/Skills.md).

---

## 5. Next steps

You're oriented. A sensible first lap:

1. **Confirm the gate is green** — `health` returns `ok` for all four facets (section 1). If not, fix that first.
2. **Bring the system up** — `./scripts/setup.sh` (fresh checkout) → `pnpm run database:start` → `pnpm nx run openthrottle-server:dev` → `pnpm nx run openthrottle-developer:dev` (section 2).
3. **Skim the operating manual** — [`CLAUDE.md`](https://github.com/openthrottle/monorepo/blob/main/CLAUDE.md) for commands, code style, and the generators-first rule.
4. **Pick the skill for your first task:**
   - Creating/working plans & tasks → [`ot-plans`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md), then execute with [`agents-ralph`](https://github.com/openthrottle/monorepo/blob/main/skills/agents-ralph/SKILL.md).
   - Adding a component/route/service/package → [`openthrottle-generators`](https://github.com/openthrottle/monorepo/blob/main/skills/openthrottle-generators/SKILL.md) (generators before hand-writing).
   - Working in the NestJS/GraphQL server or a React Router app → [`openthrottle-stack`](https://github.com/openthrottle/monorepo/blob/main/skills/openthrottle-stack/SKILL.md).
   - Shipping the change → [`github-branch`](https://github.com/openthrottle/monorepo/blob/main/skills/github-branch/SKILL.md) → [`github-commit`](https://github.com/openthrottle/monorepo/blob/main/skills/github-commit/SKILL.md) → [`github-pull-request`](https://github.com/openthrottle/monorepo/blob/main/skills/github-pull-request/SKILL.md).

When in doubt, ask the agent to pull in the matching skill — that's the OpenThrottle way.
