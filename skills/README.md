# 🤹 Skills

```bash
pnpm dlx skills add https://github.com/nrwl/nx-ai-agents-config --skill link-workspace-packages monitor-ci nx-generate nx-import nx-plugins nx-run-tasks nx-workspace --agent universal

pnpm dlx skills add https://github.com/steipete/agent-scripts --skill create-cli frontend-design skill-cleaner --agent universal

pnpm dlx skills add https://github.com/shadcn/improve --skill improve --agent universal

pnpm dlx skills add https://github.com/mattpocock/skills --skill improve grilling grill-me grill-with-docs handoff teach writing-great-skills --agent universal

- secret-scanning
- visual-plan
- visual-recap
```

> [!TIP]
>
> [Skills](https://skills.sh/) are reusable capabilities for AI agents — packaged procedural knowledge an agent can pull in to do a task the "Shiftsmart way." This folder is where **our own custom skills** live.

If you're looking for the agent-facing version of this guidance, see [`AGENTS.md`](./AGENTS.md) right next to this file.

## 🗂️ Where skills live

There are two homes for skills, and the distinction matters:

- **`.agents/skills/*` — the single merged, managed view (single source of truth).** Skills we pull in from elsewhere via the skills CLI are managed here and tracked in [`skills-lock.json`](../skills-lock.json). Install with `pnpm dlx skills add <owner>/<repo> --agent universal` so the CLI writes only here (see [`docs/Skills.md`](../docs/Skills.md)).
- **`skills/` — repo-specific skills (this folder).** Hand-authored skills that are specific enough to _this_ codebase that they don't belong in a shared set. Any Shiftsmart repo can have its own `skills/` directory for skills relevant to it.

> [!IMPORTANT]
>
> Author **custom, codebase-specific** skills here in `skills/`. Leave `.agents/skills/` as the managed home for **external** skills so the lockfile stays the source of truth.

The layout every tool reads is built by our own [`shiftsmart-skill-sync`](./shiftsmart-skill-sync/README.md) skill: authored skills are symlinked into `.agents/skills/` (the universal directory most AI tools read natively), then fanned out to the agent folders that need their own copy (e.g. `.claude/skills/` for Claude Code). It also ships a `--check` mode that CI runs as the **SSOT drift gate**. Skills travel between repos via the CLI install below, never via cross-repo symlinks.

## 📦 What's here today

**GitHub workflow skills** (formerly the `.cursor/commands/github/*` Cursor commands — now portable across every agent):

- [`github-branch/`](./github-branch/) — fork a new branch of work
- [`github-commit/`](./github-commit/) — write a conventional-commits message from the diff
- [`github-create-issue/`](./github-create-issue/) — turn descriptions into GitHub issues
- [`github-merge/`](./github-merge/) — prepare the merge commit message for a PR
- [`github-pull-request/`](./github-pull-request/) — create or update a great Pull Request
- [`github-squash/`](./github-squash/) — squash the branch to a single commit
- [`github-summarize/`](./github-summarize/) — bullet-point summary for squash-and-merge

**Infrastructure:**

- [`shiftsmart-skill-sync/`](./shiftsmart-skill-sync/) — manages this whole architecture in any repo: consistent installs, deterministic fan-out, and the CI drift check.

**Repo-specific skills:**

- [`pubsub-local-setup/`](./pubsub-local-setup/) — spinning up the local GCP Pub/Sub emulator (pairs with [`docs/PubSub-Setup.md`](../docs/PubSub-Setup.md)).

Each skill is its own directory with a `SKILL.md` at its root.

## 🔁 Sharing across Shiftsmart repos

Skills can be installed across Shiftsmart repositories with the `npx skills` CLI. Full details live in [`docs/Skills.md`](../docs/Skills.md).

```bash
# 👀 See what's available
npx skills list

# ➕ Add a skill from a repo (always --agent universal: install only to .agents/skills/)
pnpm dlx skills add <owner>/<repo> --skill <skill_name> --agent universal

# 🏠 Install our shared skills into another Shiftsmart repo
pnpm dlx skills add shiftsmartinc/shiftsmart --skill github-pull-request --agent universal

# 🏠 Keep them up to date
npx skills update
```

## ✍️ Adding a skill

Use the CLI to scaffold a new skill — `npx skills init` creates the directory and a starter `SKILL.md` for you:

```bash
# From this folder, scaffold skills/my-new-skill/SKILL.md
cd skills
npx skills init my-new-skill
```

Then:

1. Flesh out the generated `SKILL.md` — describe what the skill does and how an agent should use it. Keep it focused and self-contained.
2. Only link relatively **within** the skill's own directory — anything outside it (repo docs, other skills) must be an **absolute URL** (e.g. `https://github.com/shiftsmartinc/shiftsmart/blob/main/docs/...`). Skills are copied into other repos on install, so relative links that escape the skill directory break there.
3. If it overlaps with existing docs (like the Pub/Sub setup), cross-link the two so folks can find either entry point.

> [!TIP]
>
> Run `npx skills --help` to see everything the CLI can do (`add`, `use`, `find`, `update`, `init`, and more).

## 📚 See also

- [`AGENTS.md`](./AGENTS.md) — the agent-facing version of this guide
- [`docs/Skills.md`](../docs/Skills.md) — the skills CLI and lockfile workflow
