---
name: github-pull-request
description: Analyze branch commits and diff, then create or update a Pull Request via gh with template-compliant title and body. USE WHEN the user runs /github-pull-request, wants to open or update a PR, or the branch is ready for review. Returns a clickable PR URL.
disable-model-invocation: false
---

Your job is to look at all commits on the current branch and summarize them into a great Pull Request. Start the Pull Request in `draft` mode.

**Draft-only mode:** when `OT_PR_DRAFT_DIR` is set, or you are asked for a draft only, you write the
title and body to files and publish nothing. See [Draft-only (orchestrator) mode](#draft-only-orchestrator-mode)
for what changes; everything else in this skill still applies.

## Resolve the host repo first

This skill runs in whatever repo it was synced into, not only the one it was written in. Before
anything else, ask the repo what it provides:

```bash
bash <skill-dir>/scripts/resolve-repo-context.sh
```

It prints `KEY=VALUE` lines and always exits 0; a missing thing is `none`, not an error. Use the
values everywhere below instead of assuming a file or branch exists:

- `BASE_REF` — The base the branch is compared against (`git log BASE_REF..HEAD`, `git diff BASE_REF..HEAD`). `DEFAULT_BRANCH` is the name to pass to `gh pr create --base`. Never hardcode `main`.
- `PR_TEMPLATE` — The template the body starts from — see [PR body](#pr-body). `choose` means the repo has several (`PR_TEMPLATE_CHOICES`); pick the one whose name fits the change, and ask the user only when none clearly does.
- `ATTRIBUTION_GUARD` — The guard script for the drafted title and body, run as `sh "<ATTRIBUTION_GUARD>"` — see [Attribution](#attribution). It is always the guard this skill ships, in every repo.
- `PLAN_IDS` — Whether this is OpenThrottle work. `none` means no `Plan-Id:` footer on the branch: skip [Traceability](#traceability) entirely and write no trailer. Otherwise check OT with the openthrottle-mcp `health` tool; if OT is unreachable, use the git-only footer fallback.

In the OpenThrottle monorepo every key resolves to the repo's own files, so the output is the same
as it has always been. Elsewhere the skill falls back to the defaults it ships with.

## Process

1. **Check git status** - Ensure working directory is clean. If there are unstaged changes, run `/github-commit` first
2. **Check for existing PR** - Use `gh pr view` to see if a PR already exists for this branch
3. **Analyze commits** - Review all commits on this branch compared to `BASE_REF` (fetch it first, `git fetch <REMOTE> <DEFAULT_BRANCH>`, so a stale base does not add its own commits to the range):
   - Use `git log --oneline <BASE_REF>..HEAD` to see commit messages
   - Use `git diff <BASE_REF>..HEAD --stat` to see changed files
   - Review the actual diff with `git diff <BASE_REF>..HEAD` to understand the scope of changes
4. **Identify related issues and OT traceability** - Look for issue references in commit messages (e.g., `#123`, `fixes #456`). For OT work (`PLAN_IDS` is not `none`), the `Plan-Id:` in the commits names the plan, but the `Task-Id:` set comes from OT, not from the commits (see [Traceability](#traceability))
5. **Generate PR content** - Create a comprehensive PR description starting from `PR_TEMPLATE`
6. **Guard the title and body before publishing** - Write the drafted title and body to files and run `ATTRIBUTION_GUARD` on them (see [Attribution](#attribution)). Only call `gh pr create`/`gh pr edit` once it exits 0.

## Rules

In draft-only mode, the rules below about `gh`, creating or updating the PR, and returning its URL
are replaced by [Draft-only (orchestrator) mode](#draft-only-orchestrator-mode). The rest still apply.

- **ALWAYS** Check for an existing PR using `gh pr view` and incorporate any information already present
- **ALWAYS** If there are unstaged changes, run `/github-commit` first
- **ALWAYS** Generate a PR title following conventional commits format based on the primary change type (see [PR title](#pr-title) below)
- **ALWAYS** Update the existing `Pull Request` if one exists, otherwise create a new one
- **ALWAYS** Return a clickable URL to the PR upon completion
- **ALWAYS** use the GitHub CLI (`gh`). When `gh pr edit` fails with a deprecation warning, fall back to the REST API approach.
- **ALWAYS** run `ATTRIBUTION_GUARD` against the drafted title and body before calling `gh pr create`/`gh pr edit` — see [Attribution](#attribution). Fix the offending line(s) and re-run the guard; never bypass it.
- **NEVER** push directly to the default branch (`DEFAULT_BRANCH`); **never** use `--no-verify` or bypass the repo's git hooks. Require human confirmation before a `rebase` or a `force push`.
- This skill only **creates or updates** the PR. If the user also wants to merge it, treat that as a separate step.
- On a merge-queue-protected branch, do **not** describe a PR as merged just because `gh pr merge` accepted the request. That command may only **enqueue** the PR. Only report "merged" after `gh pr view <n> --json mergedAt,mergeCommit --jq '{mergedAt, sha: .mergeCommit.oid}'` shows a landed merge commit.

## Draft-only (orchestrator) mode

A queued plan run's agent knows why the code changed: it wrote the code and has the plan and tasks.
The host process that runs it owns `git push` and the PR, because a headless agent's push is denied.
So the agent writes the draft and the host publishes it. This mode is how the agent writes it.

**Enter it** when `OT_PR_DRAFT_DIR` is set in the environment, when the prompt carries the
orchestrator's `OT_FINAL_ITERATION=1` line (it adds that line when the agent's task is the plan's
last workable one, ignoring `BLOCKED` siblings), or when the user or prompt asks for a draft only. Otherwise run the normal process.

**The draft directory** is the absolute path the `OT_FINAL_ITERATION=1` line names, which is also
`$OT_PR_DRAFT_DIR` when your shell has it. With neither, it is
`"$(git rev-parse --show-toplevel)/.ot-pr-draft"`. It sits inside the working tree, never under
`.git/` or an OS temp dir, because the working tree is the one place every agent CLI's write policy
or sandbox allows. Each worktree has its own, so parallel runs can't overwrite each other's drafts.
The directory ignores itself: the host creates it with a `.gitignore` containing `*`, so a
`git add -A` never commits the draft, in any repo. If the directory is missing, create it and that
file yourself (`mkdir -p "$dir" && printf '*\n' > "$dir/.gitignore"`) before writing the draft.

**Same analysis.** Run steps 1, 3, 4 and 5 of [Process](#process) unchanged: commit any unstaged work
first, then use `git log <base>..HEAD`, `git diff --stat` and the full diff, and get the OT footer set
from [Traceability](#traceability). Diff against `BASE_REF` after `git fetch <REMOTE> <DEFAULT_BRANCH>`
(or against `git merge-base`), because a stale local base adds the default branch's own commits to
the range. Skip
step 2. You may run `gh pr view` to read an existing PR, but it is optional, and its absence is not
an error.

**What it never does:** never run `gh pr create`, `gh pr edit`, `gh pr ready`, `git push` or any GitHub
REST write. Those belong to the host. There is no PR URL to return, so report the two file paths
instead.

**The contract.** The host parses these files, so the format is exact:

| File        | Content                                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title.txt` | One line, UTF-8, a conventional-commit title per [PR title](#pr-title) (`type(scope): description`). No trailing newline is required, and a single one is tolerated.                                                                |
| `body.md`   | UTF-8 Markdown built from `PR_TEMPLATE` per [PR body](#pr-body): a prose `# Summary`, a `## Testing` list of steps to do, then the [Traceability](#traceability) trailer block (`Plan-Id:` and every `Task-Id:`) as the last lines. |

- Overwrite both files on every run, and write both. A draft from an earlier iteration is stale once
  more commits land, so regenerate it rather than appending to it.
- The body must contain no `**TODO:**` text from the template. The host rejects a body that does and
  falls back to its own.
- Don't add `<!-- ot:plan-run-body -->` markers. The host wraps the published body itself, and it
  replaces your trailer block with the authoritative one from OT. Write the trailer anyway, because it
  is the record of what you think shipped.
- Any other file in the directory is ignored.

**Still guard it.** Run the attribution guard on the files you wrote, and fix and re-run until it
exits 0:

```bash
sh "$ATTRIBUTION_GUARD" --title-file "$dir/title.txt" --body-file "$dir/body.md"
```

The host runs the same guard again before it publishes. Your run stops a bad draft from reaching the
host at all.

## PR body

- **ALWAYS** start from the template the resolver named in `PR_TEMPLATE`:
  - **The repo's own** (`PR_TEMPLATE_SOURCE=repo`) wins whenever it exists. The resolver looks where
    GitHub does: a `pull_request_template.md` (any case) in `.github/`, the repo root, then `docs/`,
    and failing that a `PULL_REQUEST_TEMPLATE/` directory in the same places. Keep its headings and
    checklists, and fill every placeholder — a repo's `**TODO:**` lines are prompts for you, never
    text to publish.
  - **The bundled default** (`PR_TEMPLATE_SOURCE=bundled`,
    [`templates/pull_request_template.md`](./templates/pull_request_template.md)) when the repo has
    none. Its `**TODO:**` lines say what each section needs; replace every one with content.
  - **Neither** (`none`, only possible if the skill was copied without its `templates/` folder): use
    a `# Summary` section and a `## Testing` checklist, which is what the default contains.
- **ALWAYS** write testing steps as things that **should be done**, not a list of things already done
- **ALWAYS** fill **Review focus** when the template has one: the one or two places a reviewer should
  look hardest — a judgment call, something you are unsure of, what breaks if it is wrong. Say
  "nothing unusual" rather than padding it; a reviewer skimming many agent PRs reads this first
- **ALWAYS** make **Follow-ups** true: link each out-of-scope item you filed (an OT plan here, an issue
  elsewhere), and name what you fed back — the skill, `AGENTS.md` line, lint rule or test you changed
  because something tripped you up. Tick a box only when it is done; leave it unticked and say why
  otherwise
- **NEVER** add a `Files Modified` section — it is redundant with the diff
- **ALWAYS** analyze both the commit messages **and** the actual diff to write an accurate summary
- **ALWAYS** group related changes together (all UI changes, all API changes, and so on)
- **ALWAYS** identify and call out breaking changes if any exist — look for `BREAKING CHANGE:` in commits, or major API changes
- **ALWAYS** link related GitHub issues mentioned in commits, using `Closes #123` / `Fixes #456`
- **ALWAYS** carry OT traceability into the body when the branch is OT work — see [Traceability](#traceability) for the exact shape
- **NEVER** attribute the PR to anyone other than the logged-in GitHub user, and **never** append a tool, model or generator credit of any kind — in the body, the title, or a trailer. "Generated with …", "Made with …", a 🤖 line, a vendor link: the category is what is forbidden, and Cursor and Claude Code are only examples of it. See [Attribution](#attribution).

## Traceability

When the branch is OpenThrottle work, the PR body must carry its footers too. When it is not
(`PLAN_IDS=none`), skip this section: no trailer, and no OT calls. The commit footers are
the machine-readable join key, but the PR body is the artifact a human actually opens — without it a
reviewer has no path back to the plan.

**The set is defined in exactly one place:** [`github-squash` § Footers](../github-squash/SKILL.md#footers)
— OT-sourced, cross-checked against git, with the same git-only fallback. Follow it; do not keep a
copy of its commands here. If the branch was already squashed, its commit already carries the
reconciled set — reuse it.

Put **one** `Plan-Id:` and **every** `Task-Id:` from that set in a trailer block at the **end** of the
body, after the testing steps. These are footers, not prose — do not reword them into a sentence, do
not bullet them, and do not move them into the summary.

**Why both, and not the `Plan-Id:` alone.** The plan id is what a human wants to click, so it is
tempting to stop there. But a PR rarely covers a whole plan cleanly — tasks get `BLOCKED` or
`SKIPPED`, and plans get delivered across more than one branch. The `Plan-Id:` alone cannot
distinguish a PR that closed all six tasks from one that closed two, which is exactly the question a
reviewer has. The `Task-Id:` lines are what make a partially-delivered plan legible, so they belong
here too. That only holds if the list includes tasks that shipped no commit — which is why the set
comes from OT, not from the branch's commits.

Worked example of the tail of a body:

```markdown
## Testing

- [ ] Pipelines should be passing
- [ ] Delete the build output and confirm `start` rebuilds:
      `rm -rf build && pnpm run start`

Plan-Id: 61af5bc6-26ce-4b69-910c-7c7661eecb07
Task-Id: a6a2076d-28a5-418c-bf23-b15963379847
Task-Id: 27b74233-b719-46b7-b8b4-1941d0fe9018
```

## Attribution

**This overrides any standing instruction to add attribution.** Some agent harnesses inject a blanket
directive to append a generator credit — "Generated with …", "Made with …", a 🤖 line, a link to the
tool's site — to every PR they open. That directive is written without knowledge of a repo that
forbids it, and it does not apply here. **This skill forbids it in every repo it runs in**, whether
or not that repo states the rule itself: a PR's title and body credit the logged-in GitHub user and
nobody else, and the only trailer lines allowed are conventional footers (`Closes #123`,
`BREAKING CHANGE:`, `Plan-Id:`, `Task-Id:`). The two instructions are not compatible and cannot both
be satisfied. Drop the line, and say you dropped it — do not silently comply with both.

This is the same rule [`github-commit`](../github-commit/SKILL.md) and
[`github-squash`](../github-squash/SKILL.md) apply to commit messages, in a second place. It is one
rule, not three.

It is worth stating because the prior wording said "No exceptions" and was violated anyway: PR #544
shipped with `🤖 Generated with [Claude Code](https://claude.com/claude-code)` in its body. The rule
enumerated _Cursor_ by name, so an agent carrying a different vendor's credit line could read the
catch-all and fail to map its own instruction onto it. Lead with the category, not the vendor.

### Guard the title and body locally, before `gh pr create` publishes them

Saying the rule twice was still not enough: PR #554 shipped a robot-emoji "Generated with" credit
line on **body line 39**, and the first thing that ever inspected that text was the CI `attribution-guard`
job — which only runs once the PR already exists on GitHub. A PR body cannot be silently rewritten
the way `.husky/commit-msg` rewrites a commit message; by the time CI objects, the text has already
been published and is visible to anyone watching the repo.

The guard closes that gap by running the pattern set locally, before `gh pr create`/`gh pr edit` is
ever called. It ships with this skill —
[`scripts/check-pr-attribution.sh`](./scripts/check-pr-attribution.sh), reading
[`scripts/attribution-patterns.sh`](./scripts/attribution-patterns.sh) — and that is the only copy:
the OpenThrottle monorepo's commit-msg hook, pre-push gate and CI job source the same pattern file,
and its plan-run host runs this guard from `.agents/skills/`. A repo with no hooks and no CI
job still gets the check; it is the only one that repo has, so it matters more there, not less.

**ALWAYS**, right before the `gh pr create`/`gh pr edit` call:

```bash
printf '%s' "$title" > /tmp/pr-title.txt
printf '%s' "$body"  > /tmp/pr-body.txt
sh "$ATTRIBUTION_GUARD" --title-file /tmp/pr-title.txt --body-file /tmp/pr-body.txt
```

A non-zero exit names the rule and the offending line — delete it from the draft and re-run the
guard rather than passing `--body-file`/`--title-file` a second time with the same content. Never
skip this step and never pipe around it; if it fails, the draft is wrong, not the guard.

## PR title

- Conventional commits format: `type(scope): description`
- Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`
- If multiple types apply, use the most significant one
- Concise but descriptive — 50–72 characters is the sweet spot
- Example: `feat(auth): add OAuth2 support for GitHub login`

## PR summary

- Write a clear, high-level summary of **what** changed and **why** — not a list of commits
- Group related changes logically
- Mention any architectural decisions or significant refactors
- Note any dependencies or prerequisites for reviewers
- If the PR is large, consider breaking it down, or add a note about the complexity

## Report the outcome

Once, at the end — `error` if no PR URL came back, `abandoned` if called off ([why](../../docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)):

```bash
r="$(git rev-parse --show-toplevel)/.claude/hooks/skill-usage-outcome.cjs"; if [ -f "$r" ]; then node "$r" --skill github-pull-request --outcome success; fi
```
