# Draft-only (orchestrator) mode

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

**Same analysis.** Run steps 1, 3, 4 and 5 of [Process](../SKILL.md#process) unchanged: commit any uncommitted work
first, then use `git log <base>..HEAD`, `git diff --stat` and the full diff, and get the OT footer set
from [Traceability](traceability.md). Diff against `BASE_REF` after `git fetch <REMOTE> <DEFAULT_BRANCH>`
(or against `git merge-base`), because a stale local base adds the default branch's own commits to
the range. Skip
step 2. You may run `gh pr view` to read an existing PR, but it is optional, and its absence is not
an error.

**What it never does:** never run `gh pr create`, `gh pr edit`, `gh pr ready`, `git push` or any GitHub
REST write. Those belong to the host. There is no PR URL to return, so report the two file paths
instead.

**The contract.** The host parses these files, so the format is exact:

| File        | Content                                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title.txt` | One line, UTF-8, a conventional-commit title per [PR title](../SKILL.md#pr-title) (`type(scope): description`). No trailing newline is required, and a single one is tolerated.                                                                  |
| `body.md`   | UTF-8 Markdown built from `PR_TEMPLATE` per [PR body](../SKILL.md#pr-body): a prose `# Summary`, a `## Testing` list of steps to do, then the [Traceability](traceability.md) trailer block (`Plan-Id:` and every `Task-Id:`) as the last lines. |

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
