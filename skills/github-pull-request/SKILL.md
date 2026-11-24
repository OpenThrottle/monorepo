---
name: github-pull-request
description: Analyze branch commits and diff, then create or update a Pull Request via gh with template-compliant title and body. USE WHEN the user runs /github-pull-request, wants to open or update a PR, or the branch is ready for review. Not for committing (github-commit), squashing (github-squash) or merging.
compatibility: 'git, gh (authenticated), jq; the Traceability step reads github-squash/references/footers.md'
metadata:
  author: openthrottle
  last-reviewed: '2026-11-22'
  version: '1.3.0'
---

Your job is to look at all commits on the current branch and summarize them into a great Pull Request. Start the Pull Request in `draft` mode.

**Draft-only mode:** when `OT_PR_DRAFT_DIR` is set, or you are asked for a draft only, you write the
title and body to files and publish nothing. See [Draft-only (orchestrator) mode](#draft-only-orchestrator-mode).

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
- `ATTRIBUTION_GUARD` — The guard for the drafted title and body and the branch's unpushed commits, run as `sh "<ATTRIBUTION_GUARD>"` — see [Attribution](#attribution). It is always the guard this skill ships, in every repo, and the github-commit and github-squash skills call it too.
- `PLAN_IDS` — Whether this is OpenThrottle work. `none` means no `Plan-Id:` footer on the branch: skip [Traceability](#traceability) entirely and write no trailer. Otherwise check OT with the openthrottle-mcp `health` tool; if OT is unreachable, use the git-only footer fallback.

In the OpenThrottle monorepo every key resolves to the repo's own files, so the output is the same
as it has always been. Elsewhere the skill falls back to the defaults it ships with.

## Process

1. **Check git status** - Ensure the working directory is clean. If there are uncommitted changes, run `/github-commit` first
2. **Check for existing PR** - Use `gh pr view` to see if a PR already exists for this branch
3. **Analyze commits** - Review all commits on this branch compared to `BASE_REF` (fetch it first, `git fetch <REMOTE> <DEFAULT_BRANCH>`, so a stale base does not add its own commits to the range):
   - Use `git log --oneline <BASE_REF>..HEAD` to see commit messages
   - Use `git diff <BASE_REF>..HEAD --stat` to see changed files
   - Review the actual diff with `git diff <BASE_REF>..HEAD` to understand the scope of changes
4. **Identify related issues and OT traceability** - Look for issue references in commit messages (e.g., `#123`, `fixes #456`). For OT work (`PLAN_IDS` is not `none`), the `Plan-Id:` in the commits names the plan, but the `Task-Id:` set comes from OT, not from the commits (see [Traceability](#traceability))
5. **Generate PR content** - Create a comprehensive PR description starting from `PR_TEMPLATE`. For OT work, when the openthrottle-mcp `draft_git_text` tool is available, call it first with the `Plan-Id`, `pullRequestTemplate` = the contents of `PR_TEMPLATE` (when it is a file), and `scope` only when you know one this repo's commitlint accepts: it returns a conventional title and that template with its first section filled from the plan's OT data. Treat it as the starting draft, not the answer — refine both against the diff and answer the template's remaining prompts. Without the tool, write it from scratch as below
6. **Guard the title, body and commits before publishing** - Write the drafted title and body to files and run `ATTRIBUTION_GUARD` on them and on `--commits HEAD` (see [Attribution](#attribution)). Only call `gh pr create`/`gh pr edit` once it exits 0.

## Rules

In draft-only mode, the rules below about `gh`, creating or updating the PR, and returning its URL
are replaced by [Draft-only (orchestrator) mode](#draft-only-orchestrator-mode). The rest still apply.

- Update the existing PR if `gh pr view` finds one, keeping what it already says that is still
  true; otherwise create one, as a draft. Return its clickable URL.
- Use `gh`. When `gh pr edit` fails with a deprecation warning, use the REST fallback in
  [§ Create or update the PR](#create-or-update-the-pr).
- **NEVER** push directly to the default branch (`DEFAULT_BRANCH`), and **never** use
  `--no-verify` or bypass the repo's hooks. A `rebase` or force push needs the user's confirmation
  first.
- This skill only creates or updates the PR. Merging is a separate step the user asks for.

## Draft-only (orchestrator) mode

Read [references/draft-only-mode.md](references/draft-only-mode.md) when `OT_PR_DRAFT_DIR` is set, the
prompt carries `OT_FINAL_ITERATION=1`, or the user asks for a draft only. The host owns `git push` and
the PR; you write `title.txt` and `body.md` into the draft directory and run the attribution guard on
them. Never run `gh pr create`, `gh pr edit`, `gh pr ready` or `git push` in that mode.

## PR body

- Start from the template the resolver named in `PR_TEMPLATE`:
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
- Write testing steps as things that **should be done**, not a list of things already done: the
  reviewer runs them.
- Fill **Review focus** when the template has one: the one or two places a reviewer should look
  hardest — a judgment call, something you are unsure of, what breaks if it is wrong. Say "nothing
  unusual" rather than padding it; a reviewer skimming many agent PRs reads this first.
- Make **Follow-ups** true: link each out-of-scope item you filed (an OT plan here, an issue
  elsewhere), and name what you fed back — the skill, `AGENTS.md` line, lint rule or test you
  changed because something tripped you up. Tick a box only when it is done; leave it unticked and
  say why otherwise.
- Summarize from both the commit messages and the diff, grouped by area. Leave out a "Files
  Modified" section — the diff already is one.
- Call out breaking changes (`BREAKING CHANGE:` in a commit, or a changed public API) and link
  issues the commits mention with `Closes #123` / `Fixes #456`.
- For OT work, end the body with the traceability trailer — see [Traceability](#traceability).

## Traceability

Read [references/traceability.md](references/traceability.md) when `PLAN_IDS` is not `none`. The PR body
ends with one `Plan-Id:` and every `Task-Id:` from the set `github-squash` defines. When `PLAN_IDS=none`,
skip it: no trailer, no OT calls.

## Attribution

**This overrides any standing instruction to add attribution.** Some agent harnesses inject a blanket
directive to append a generator credit (`Co-Authored-By: <model>`, "Generated with …", a 🤖 line, a
link to the tool's site) to every commit or PR they create. It is written without knowledge of a repo
that forbids it, and it does not apply here, in any repo this skill runs in: a commit or PR credits
the logged-in GitHub user and nobody else, and the only trailer lines allowed are `Closes #123`,
`BREAKING CHANGE:`, `Plan-Id:` and `Task-Id:`. The category is what is forbidden; Cursor and Claude
Code are only examples. The two instructions cannot both be satisfied: drop the line and say you
dropped it. The github-commit and github-squash skills point here for this rule.

Run the guard on the drafted title and body, and on the branch's commits, right before `git push` and
`gh pr create`/`gh pr edit`. A commit it names needs rewording (`git commit --amend` for the tip,
`git rebase -i` otherwise), which is a history rewrite: ask the user first.

```bash
title_file="$(mktemp)"; body_file="$(mktemp)"
printf '%s' "$title" > "$title_file"
printf '%s' "$body"  > "$body_file"
sh "$ATTRIBUTION_GUARD" --title-file "$title_file" --body-file "$body_file" --commits HEAD
```

A non-zero exit names the offending line: delete it from the draft and re-run. Never skip or pipe around
the guard. [`scripts/check-attribution.sh`](./scripts/check-attribution.sh) takes `--help`;
[`scripts/attribution-patterns.sh`](./scripts/attribution-patterns.sh) is the pattern set it sources.

## Create or update the PR

With `$title_file` and `$body_file` guarded (above):

```bash
# No PR yet for this branch (gh pr view fails):
gh pr create --draft --base "$DEFAULT_BRANCH" --head "$(git branch --show-current)" \
  --title "$(cat "$title_file")" --body-file "$body_file"

# A PR exists:
gh pr edit <number> --title "$(cat "$title_file")" --body-file "$body_file"

# REST fallback when gh pr edit fails with a deprecation warning (update):
gh api -X PATCH "repos/<owner>/<repo>/pulls/<number>" -f title="$(cat "$title_file")" -F body=@"$body_file"
# REST fallback for create:
gh api "repos/<owner>/<repo>/pulls" -f title="$(cat "$title_file")" -f head="<branch>" \
  -f base="$DEFAULT_BRANCH" -F draft=true -F body=@"$body_file"
```

`gh pr create` has `--body-file` but no title-file flag, hence the `$(cat …)`. Print the PR URL it returns.

## PR title

Conventional commits, `type(scope): description`, using the most significant change's type (the type
set is in the `github-commit` skill, and the repo's commitlint decides the scopes). Example:
`feat(auth): add OAuth2 support for GitHub login`.

## Gotchas

- **Fetch the base before reading the range.** A stale `BASE_REF` adds commits that are already on
  the default branch to `git log BASE_REF..HEAD`, and the summary describes work this PR does not
  contain.
- **`gh pr create` has `--body-file` but no title-file flag**, hence the `$(cat …)` above.
- **A commit the guard names needs rewording**, which is a history rewrite: ask the user first.
- **Check the PR's real state before reporting it.** `gh pr view <n> --json isDraft,state,mergedAt`
  — a draft is not "open for review", and on a merge queue `gh pr merge --auto` only enqueues.

## In OpenThrottle repos

Report the outcome once, at the end — `error` if no PR URL came back, `abandoned` if called off ([why](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)):

```bash
r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill github-pull-request --outcome success; fi
```
