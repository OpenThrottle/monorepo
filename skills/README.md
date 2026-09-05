# 🤹 Skills

This directory contains **[Agent Skills](https://agentskills.io/)** — the open standard for packaging procedural knowledge so any compatible agent (Cursor, Claude Code, Codex, Copilot, Gemini CLI, OpenCode, …) can load it on demand.

We follow that standard as far as it goes. Do **not** invent a parallel skill format, frontmatter dialect, or directory layout. If the spec covers it, use the spec.

```bash
# https://github.com/nrwl/nx-ai-agents-config
pnpm dlx skills add https://github.com/nrwl/nx-ai-agents-config --skill link-workspace-packages monitor-ci nx-workspace --agent universal

# https://github.com/steipete/agent-scripts#agent-scripts
pnpm dlx skills add https://github.com/steipete/agent-scripts --skill frontend-design --agent universal

# https://github.com/shadcn/improve#improve
pnpm dlx skills add https://github.com/shadcn/improve --skill improve --agent universal

# https://github.com/mattpocock/skills?tab=readme-ov-file
pnpm dlx skills add https://github.com/mattpocock/skills --skill grilling --agent universal


- secret-scanning
- visual-plan
- visual-recap
```

> [!TIP]
>
> **Format vs registry.** [agentskills.io](https://agentskills.io/) is _what a skill is_ (folder + `SKILL.md` + progressive disclosure). [skills.sh](https://skills.sh/) is _how we install third-party skills_ into this repo. This folder is where **our own custom skills** live.

If you're looking for the agent-facing version of this guidance, see [`AGENTS.md`](./AGENTS.md) right next to this file.

## 📐 The standard (source of truth)

Author and review skills against these pages — not against a local rewrite:

| What                                                                                                           | Where                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| What a skill is                                                                                                | [Agent Skills overview](https://agentskills.io/)                                         |
| Folder layout, `SKILL.md` frontmatter, optional `scripts/` / `references/` / `assets/`, progressive disclosure | [Specification](https://agentskills.io/specification)                                    |
| Scope, token budget, templates, checklists                                                                     | [Best practices](https://agentskills.io/skill-creation/best-practices)                   |
| `description` (what + when, trigger keywords)                                                                  | [Optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) |
| Bundled executables                                                                                            | [Using scripts](https://agentskills.io/skill-creation/using-scripts)                     |
| Clients that already speak this format                                                                         | [Client showcase](https://agentskills.io/clients)                                        |

Minimum shape from the spec — a directory whose name matches the `name` frontmatter field, with a `SKILL.md` at its root:

```
skill-name/
├── SKILL.md          # Required: YAML frontmatter (`name`, `description`) + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation loaded on demand
├── assets/           # Optional: templates, resources
└── ...
```

Required frontmatter: `name` (kebab-case, matches the directory) and `description` (what the skill does **and** when to use it). Keep `SKILL.md` under 500 lines; push detail into `references/` so agents can [progressively disclose](https://agentskills.io/specification#progressive-disclosure) it.

Need a machine check? The spec’s validator is [`skills-ref`](https://github.com/agentskills/agentskills/tree/main/skills-ref) (`skills-ref validate ./skills/my-skill`) — a format check, not a production dependency.

## 🗂️ Where skills live

There are three homes for skills, and the distinction matters:

- **`.agents/skills/*` — the single merged, managed view (single source of truth).** Skills we pull in from elsewhere via the skills CLI are managed here and tracked in [`skills-lock.json`](../skills-lock.json). Install with `pnpm dlx skills add <owner>/<repo> --agent universal` so the CLI writes only here (see [`docs/Skills.md`](../docs/Skills.md)).
- **`skills/` — repo-specific skills (this folder).** Hand-authored skills that are specific enough to _this_ codebase that they don't belong in a shared set. Any OpenThrottle repo can have its own `skills/` directory for skills relevant to it.
- **`~/.openthrottle/skills/` — your personal skills, outside the repo.** Private and experimental, linked in by the sync so they reach every agent CLI exactly like a committed skill, and impossible to commit. This is where a half-formed idea belongs while it is still half-formed. See [Adding a skill](#️-adding-a-skill) for how one graduates.

> [!IMPORTANT]
>
> Author **custom, codebase-specific** skills here in `skills/`. Leave `.agents/skills/` as the managed home for **external** skills so the lockfile stays the source of truth.

The layout every tool reads is built by our own [`ot-skill-sync`](./ot-skill-sync/README.md) skill: authored skills are symlinked into `.agents/skills/` (the universal directory most AI tools read natively), then fanned out to the agent folders that need their own copy (e.g. `.claude/skills/` for Claude Code). It also ships a `--check` mode that CI runs as the **SSOT drift gate**. Skills travel between repos via the CLI install below, never via cross-repo symlinks.

## 📦 What's here today

**GitHub workflow skills** (formerly the `.cursor/commands/github/*` Cursor commands — now portable across every agent):

- [`github-commit/`](./github-commit/) — write a conventional-commits message from the diff
- [`github-pull-request/`](./github-pull-request/) — create or update a great Pull Request
- [`github-squash/`](./github-squash/) — squash the branch to a single commit

Branches come from `pnpm run worktree:new <name>`, the one entrypoint for a branch plus its
worktree. The machinery behind that script is [`ot-worktree/`](./ot-worktree/) below.

**Agents/workflow:**

- [`ot-loop/`](./ot-loop/) — drive one OT plan to a PR with the built-in `/loop`, a task at a time in an isolated worktree. Canonical source of the per-task discipline.
- [`ot-loop-review/`](./ot-loop-review/) — the reflection stage after `ot-loop`: audits an executed run against a fixed rubric, separates friction from defects, and files the follow-ups. Read-only on code.
- [`agents-ralph/`](./agents-ralph/) — the Ralph prompt: turn an idea or PRD into an OT plan, then execute it a task at a time. Self-contained, so the `workflow-ralph` CLI can feed it to an agent as a standalone prompt.

**Infrastructure:**

- [`ot-skill-sync/`](./ot-skill-sync/) — manages this whole architecture in any repo: consistent installs, deterministic fan-out, and the CI drift check.

**Repo-specific skills:**

- [`ot-onboarding/`](./ot-onboarding/) — the front-door orientation skill new users invoke first: verifies the OT MCP is healthy, then tours the mental model, monorepo, shortcuts/workflows, and the skill catalog.
- [`ot-folders/`](./ot-folders/) — where code goes, what it is named, what shape it must have, and how to prove it — the placement rules behind the `openthrottle/*` lint rules and module boundaries.
- [`ot-generators/`](./ot-generators/) — scaffolding with `@tools/generators`: which generator makes an app, package, component, route or NestJS service, and how to run one.
- [`ot-plans/`](./ot-plans/) — plans and tasks via the `openthrottle-mcp` server, plus the `Plan-Id`/`Task-Id` and work-ledger traceability rules.
- [`ot-postgres/`](./ot-postgres/) — SQL authoring under `databases/`: migrations, table design and naming, `COMMENT ON` standards, idempotent DDL.
- [`ot-stack/`](./ot-stack/) — conventions for the platform itself: `openthrottle-server`, the developer app, the GraphQL schema, embeddings and semantic ingest.
- [`ot-worktree/`](./ot-worktree/) — the portable machinery behind `worktree:new`, `worktree:heal` and `worktree:remove`: creating, provisioning and tearing down a worktree.

Each skill is its own directory with a `SKILL.md` at its root, per the [specification](https://agentskills.io/specification).

## 🔁 Sharing across OpenThrottle repos

Skills can be installed across OpenThrottle repositories with the `npx skills` CLI. Full details live in [`docs/Skills.md`](../docs/Skills.md).

```bash
# 👀 See what's available
npx skills list

# ➕ Add a skill from a repo (always --agent universal: install only to .agents/skills/)
pnpm dlx skills add <owner>/<repo> --skill <skill_name> --agent universal

# 🏠 Install our shared skills into another openthrottle repo
pnpm dlx skills add openthrottle/monorepo --skill ot-skill-sync --agent universal

# 🏠 Keep them up to date
npx skills update
```

## ✍️ Adding a skill

Scaffold with the CLI, then write the skill to the [specification](https://agentskills.io/specification) and [best practices](https://agentskills.io/skill-creation/best-practices):

```bash
# From this folder, scaffold skills/my-new-skill/SKILL.md
cd skills
npx skills init my-new-skill
```

Then:

1. Flesh out the generated `SKILL.md` — required `name` + `description` frontmatter, then instructions. Keep it focused and self-contained. Prefer the spec's optional dirs (`scripts/`, `references/`, `assets/`) over ad-hoc layouts.
2. Only link relatively **within** the skill's own directory — anything outside it (repo docs, other skills) must be an **absolute URL** (e.g. `https://github.com/openthrottle/monorepo/blob/main/docs/...`). Skills are copied into other repos on install, so relative links that escape the skill directory break there.
3. If it overlaps with existing docs (as `ot-onboarding` does with [`docs/openthrottle/first-time-onboarding.md`](../docs/openthrottle/first-time-onboarding.md)), cross-link the two so folks can find either entry point.

> [!TIP]
>
> Run `npx skills --help` to see everything the CLI can do (`add`, `use`, `find`, `update`, `init`, and more).

### Starting private, and graduating

Not every idea is ready for a PR. A **personal skill** lives outside the repo at `~/.openthrottle/skills/<name>/SKILL.md` and is linked in by the sync, so you can use it exactly like a committed skill while you work out whether it earns its place — and it cannot be committed by accident:

```bash
bash ot-skill-sync/scripts/personal.sh new my-idea      # scaffold + sync
bash ot-skill-sync/scripts/personal.sh list             # what you have, and where it links
bash ot-skill-sync/scripts/personal.sh promote my-idea  # move it into skills/, re-sync, stage it
```

`promote` moves it into `skills/` (never copies), re-validates the layout, stages it, and tells you the remaining touchpoints — the [`docs/Skills.md`](../docs/Skills.md) list and its description-budget re-measure. `demote` is the inverse, for promoting too early. A personal skill may not share a name with a committed one; that is a hard error, so nobody unknowingly runs a private fork of a team skill.

## 🎯 Writing a skill that earns its context

Harvested from the vendored `writing-great-skills` skill before it was retired (2026-08-20).
A skill exists to wrangle determinism out of a stochastic system: **predictability** — the agent
taking the same _process_ every run — is the root virtue, and every rule below serves it.

**Pick the invocation mode deliberately.** A model-invocable skill keeps its `description` in every
session's context window whether or not it fires. A skill with `disable-model-invocation: true`
costs zero context — only a human typing its name reaches it — but spends _your_ memory instead,
since you become the index. Choose model-invocation only when the agent, or another skill, must
reach it unprompted.

**The description is a routing decision, not a summary.** It answers one question: _should the model
open this file right now?_ So:

- Front-load the distinctive word — that is where the invocation work happens.
- One trigger per branch. Synonyms that rename the same branch are duplication paid for twice.
- Cut identity that the body already carries. Keep triggers plus any "when another skill needs…"
  clause, and nothing else.
- Keep the explicit not-this-skill disambiguators. A line pointing away from a neighbouring skill
  earns its bytes.

**Rank content by how immediately it is needed.** Steps in `SKILL.md` for what the agent does in
order; reference in `SKILL.md` for what it consults on demand; a linked sibling file for reference
only some runs reach. Push too little down and the top bloats; push too much and you hide what the
agent needs. Branching is the cleanest test: inline what every run needs, disclose what only some
runs reach.

**End each step on a checkable completion criterion.** "Every modified model accounted for" beats
"produce a change list" — a vague criterion invites the agent to stop early.

**Split only when the cut earns it.** Split off a model-invocable skill when a distinct trigger word
should fire it on its own. Split a run of steps when the steps still ahead tempt the agent to rush
the one in front of it.

**Prune on a schedule.** Keep each meaning in exactly one place. Then test each sentence in
isolation: does it change behaviour versus what the model already does by default? If not, delete
the whole sentence rather than trimming words from it. Most prose that fails this test should go.

**Prompt the positive.** Steering by prohibition backfires — naming the banned behaviour makes it
more available, not less. State the target behaviour instead, and keep a prohibition only as a hard
guardrail you cannot phrase positively, paired with what to do instead.

**Failure modes worth naming:** _sediment_ (stale layers that settle because adding feels safe and
removing feels risky — the default fate of any skill without a pruning discipline), _sprawl_ (too
long even when every line is live), _duplication_, and _no-ops_ (lines the model already obeys, so
you pay context to say nothing).

## 📚 See also

- [Agent Skills](https://agentskills.io/) — the open format this directory implements
- [`AGENTS.md`](./AGENTS.md) — the agent-facing version of this guide
- [`docs/Skills.md`](../docs/Skills.md) — the skills CLI and lockfile workflow
