---
name: ot-onboarding
description: >-
  Guided orientation tour of OpenThrottle for a new person or a fresh session,
  ending in a first real plan. USE WHEN running /ot-onboarding, or the user says
  "onboard me", "I'm new here" or "where do I start", or asks you to remember
  that plans belong in OT rather than in Markdown. Gates on an openthrottle-mcp
  health check first. Not for plan CRUD (ot-plans) or a specific subsystem
  (ot-stack, ot-folders).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-14'
  version: '1.1.0'
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

**Step 3 — interpret and fail loudly.** If `health` errors or any facet is not `ok`, **report the exact failure and the fix — do not proceed to section 2.** Read [references/health-troubleshooting.md](references/health-troubleshooting.md) when it fails: symptom → cause → remediation table (no tools, 401, database/redis not ok, "fetch failed" in a worktree).

**Setup from zero.** If this is a fresh checkout, `./scripts/setup.sh` provisions the environment and seeds the service accounts; it ends by running `pnpm check:bootstrap-secrets` which fails loudly if any required token is missing.

**Runbooks (authoritative — read these, don't guess):**

- Auth, token types, and rotation → [`packages/openthrottle-mcp/docs/AUTH.md`](https://github.com/openthrottle/monorepo/blob/main/packages/openthrottle-mcp/docs/AUTH.md)
- MCP registration / the config block → [`docs/openthrottle/mcp-registration.md`](https://github.com/openthrottle/monorepo/blob/main/docs/openthrottle/mcp-registration.md)
- Env preflight → [`scripts/verify-openthrottle-mcp-env.ts`](https://github.com/openthrottle/monorepo/blob/main/scripts/verify-openthrottle-mcp-env.ts)
- **Stdio fallback:** drive [`scripts/run-openthrottle-mcp.sh`](https://github.com/openthrottle/monorepo/blob/main/scripts/run-openthrottle-mcp.sh) directly over stdio (export `API_URL` / `API_URL_INTERNAL` from the server app URL) when the registered server is unreachable.
- **Curl fallback:** hit the GraphQL endpoint directly with your `Authorization: Bearer <token>` when the pinned MCP port is dead — enough to unblock while you fix the registration.

Only once `health` is green across all four facets do you continue.

### Then: check telemetry coverage (a warning, never a gate)

Skill-usage telemetry is optional but fails **silently**: a session started by hand outside this
repo records nothing without the `openthrottle@openthrottle` plugin. Run
`node <ot-checkout>/.claude/hooks/skill-usage-doctor.cjs --json`, give each check one line, and relay
its `fix` lines verbatim. The plugin install changes the user's global Claude setup: **ask first**, never unasked. Ongoing view: `/usage` → Telemetry coverage
([contract §8](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/child-repo-hook-telemetry-contract.md#8-coverage-heartbeat)).

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

Onboarding runs once; without this the rule evaporates when the session ends. **A write to a user-global surface is a global write: ask the user first, then write.** Map the intent onto whatever your own host provides — pick your row:

| Host agent          | Where to persist it                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Claude Code         | the user-global memory store (`~/.claude/projects/<project>/memory/` + its `MEMORY.md` index) |
| Codex               | `$CODEX_HOME/AGENTS.md` (usually `~/.codex/AGENTS.md`)                                        |
| Grok Build          | its own memory store — `grok memory` (a command, not a file)                                  |
| OpenCode            | `~/.config/opencode/AGENTS.md`                                                                |
| Cursor, Antigravity | **no writable surface** — use the fallback below                                              |

Two hard constraints on where it goes:

- **Prefer a user-global surface.** A repo-tracked file (`CLAUDE.md`, `AGENTS.md`, a doc under `docs/`)
  is a **code change** — it belongs in a PR, never as a silent side effect of onboarding.
- **If your host has no writable memory surface** — or you are unsure it has one — do **not** invent
  a file. State the rule back to the user verbatim and tell them where to paste it by hand (their
  agent's User Rules / global instructions). This is the honest answer for roughly a third of the
  hosts OpenThrottle supports, not an edge case.

**Confirm the write; never claim it silently.** Report the exact path you wrote (or the command you
ran) and quote the line back. If the write failed, say so and fall back to the paste-by-hand path.

### Then sweep out the guidance that fights it

Persisting the rule is only half the job — the host may already be carrying instructions that say the opposite. Work this as **search → report → ask → edit**, and never collapse those four steps. Read [references/guidance-sweep.md](references/guidance-sweep.md) for the grep and the triage rules (search and report steps).

**Ask.** Get explicit confirmation before changing anything outside your own memory store.

- Your own memory/rules store — a user-global write: ask first, then fix it and say what you changed.
- **Repo-tracked files** (`CLAUDE.md`, `AGENTS.md`, a doc under `docs/`, another skill) — a **code
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

Everything runs **through Nx, prefixed with pnpm** (`pnpm nx …`). Bring-up commands and the folder layout are in the operating manual below — do not restate them.

**Don't duplicate — go read the source of truth:**

- [`CLAUDE.md`](https://github.com/openthrottle/monorepo/blob/main/CLAUDE.md) — commands, code style, generators-first, git/agent rules (the operating manual)
- [`MONOREPO.md`](https://github.com/openthrottle/monorepo/blob/main/MONOREPO.md) — how the Nx + pnpm workspace is organized
- [`AGENTS.md`](https://github.com/openthrottle/monorepo/blob/main/AGENTS.md) — the tiered agent-facing guidance (per-project `AGENTS.md` files sit next to the code they describe)
- [`CONTRIBUTING.md`](https://github.com/openthrottle/monorepo/blob/main/CONTRIBUTING.md) — contribution conventions, incl. the source-first React Router packages
- [`databases/openthrottle/README.md`](https://github.com/openthrottle/monorepo/blob/main/databases/openthrottle/README.md) — schema, migrations, DB setup

---

## 4. Everyday workflows

One line each on when you'd reach for it, with the deeper skill to read:

| Lever                               | Reach for it when…                                                                                                   | Deeper skill                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **`/loop`**                         | you want a prompt or slash command to run on a repeating interval (poll a deploy, keep grinding a task list)         | built-in `loop` skill                                                                   |
| **`ot-loop`** (`/ot-loop <planId>`) | you have an OT plan and want its tasks executed one at a time via `/loop`, with `Plan-Id:` / `Task-Id:` traceability | [`ot-loop`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-loop/SKILL.md) |

**The `github-*` workflow skills** — the portable git/PR toolkit (one job each):

- [`github-commit`](https://github.com/openthrottle/monorepo/blob/main/skills/github-commit/SKILL.md) — write a conventional-commit message from the diff
- [`github-pull-request`](https://github.com/openthrottle/monorepo/blob/main/skills/github-pull-request/SKILL.md) — create or update a template-compliant PR
- [`github-squash`](https://github.com/openthrottle/monorepo/blob/main/skills/github-squash/SKILL.md) — squash the branch to a single commit before merge

The git guard rails (no push to `main`, no `--no-verify`, no attribution lines) are in `CLAUDE.md`.

---

## 5. How skills work here + the catalog

Skills are packaged, reusable know-how an agent pulls in to do a task "the OpenThrottle way." There are **two homes**, and the distinction matters:

- **`skills/` — authored, repo-specific skills.** Hand-written, committed, PR-reviewed (this skill lives here). Any OpenThrottle repo can have its own `skills/`.
- **`.agents/skills/` and `.claude/skills/` — generated.** Never hand-edit them; real dirs in `.agents/skills/` are external skills tracked in `skills-lock.json`.

**Fan-out is automated — never hand-edit generated dirs.** Run the [`ot-skill-sync`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-skill-sync/SKILL.md) skill after editing or adding a skill.

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
   Grok, OpenCode, Antigravity — and any of them can author a plan; the deep links a
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
   - Creating/working plans & tasks → [`ot-plans`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md), then execute with [`ot-loop`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-loop/SKILL.md).
   - Adding a component/route/service/package → [`ot-generators`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-generators/SKILL.md) (generators before hand-writing).
   - Working in the NestJS/GraphQL server or a React Router app → [`ot-stack`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-stack/SKILL.md).
   - Shipping the change → `pnpm run worktree:new <name>` → [`github-commit`](https://github.com/openthrottle/monorepo/blob/main/skills/github-commit/SKILL.md) → [`github-pull-request`](https://github.com/openthrottle/monorepo/blob/main/skills/github-pull-request/SKILL.md).

When in doubt, ask the agent to pull in the matching skill — that's the OpenThrottle way.
