# 🤹 Skills

This directory contains **[Agent Skills](https://agentskills.io/)** — the open standard for packaging procedural knowledge so any compatible agent (Cursor, Claude Code, Codex, Copilot, Antigravity, OpenCode, …) can load it on demand.

We follow that standard as far as it goes. Do **not** invent a parallel skill format, frontmatter dialect, or directory layout. If the spec covers it, use the spec.

```bash
# https://github.com/nrwl/nx-ai-agents-config
pnpm dlx skills add https://github.com/nrwl/nx-ai-agents-config --skill link-workspace-packages monitor-ci nx-workspace --agent universal

# https://github.com/steipete/agent-scripts#agent-scripts
pnpm dlx skills add https://github.com/steipete/agent-scripts --skill frontend-design --agent universal

# https://github.com/mattpocock/skills?tab=readme-ov-file
pnpm dlx skills add https://github.com/mattpocock/skills --skill grilling --agent universal
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

How to write and review one against these pages is the [`ot-skill-guide`](./ot-skill-guide/SKILL.md) skill; it owns the authoring rules, so they are not repeated here.

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

The catalog of every installed skill, owned and vendored, with a line on each, is [`docs/Skills.md`](../docs/Skills.md). Branches come from `pnpm run worktree:new <name>`, the one entrypoint for a branch plus its worktree; the machinery behind it is [`ot-worktree/`](./ot-worktree/).

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

1. Write it with the [`ot-skill-guide`](./ot-skill-guide/SKILL.md) skill's author mode, and run its `scripts/check.sh` before opening the PR.
2. Add it to the catalog in [`docs/Skills.md`](../docs/Skills.md).
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

The rules that used to live here (harvested from the retired vendored `writing-great-skills` skill on 2026-08-20: invocation mode, descriptions as routing decisions, checkable step endings, prompting the positive, pruning) moved into [`ot-skill-guide`](./ot-skill-guide/SKILL.md) on 2026-11-22 so there is one copy.

## 📚 See also

- [Agent Skills](https://agentskills.io/) — the open format this directory implements
- [`AGENTS.md`](./AGENTS.md) — the agent-facing version of this guide
- [`docs/Skills.md`](../docs/Skills.md) — the skills CLI and lockfile workflow
