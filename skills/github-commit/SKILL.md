---
name: github-commit
description: Stage changes and create a conventional commit from the current diff. USE WHEN the user runs /github-commit, asks to commit changes, or needs a commit message derived from staged/unstaged work. Not for opening a PR (github-pull-request) or squashing (github-squash).
compatibility: 'git; the github-pull-request skill supplies the repo resolver and attribution guard'
metadata:
  author: openthrottle
  last-reviewed: '2026-11-22'
  version: '1.3.0'
---

## Resolve the host repo first

This skill runs in whatever repo it was synced into. Ask the repo what it enforces before you write
the message:

```bash
bash "$(git rev-parse --show-toplevel)/.agents/skills/github-pull-request/scripts/resolve-repo-context.sh"
```

It lives in the `github-pull-request` skill and is reached through `.agents/skills/`, which the
skill fan-out builds in the OpenThrottle repo and skill injection builds in every other repo.

It prints `KEY=VALUE` lines and always exits 0. Four keys matter here:

- `COMMITLINT_CONFIG` — A path: read it (and anything it `extends`) for the allowed `type-enum` and `scope-enum`, the header and body line limits, and any case rules, and follow them — the hook will reject anything else. A scope list computed at runtime (from workspace project names, say) means the scope must be one of those names. `none`: see [With no commitlint](#with-no-commitlint).
- `COMMIT_MSG_HOOK` — A path: a hook checks or rewrites the message (see [Safety](#safety)). `none`: nothing checks it, and every rule below is yours alone to keep.
- `DEFAULT_BRANCH` — The branch you never commit or push to directly. Treat `master` the same even when it is not the default.
- `ATTRIBUTION_GUARD` — The guard you run on the message and the commits; see [Safety](#safety).

### With no commitlint

Write plain [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

- **Header:** `type(scope): description`, at most 72 characters. Types: `feat`, `fix`, `docs`,
  `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `style`, `revert`.
- **Scope:** the package, app or top-level directory most of the diff touches (`api`, `docs`,
  `cli`). If the change spans the whole repo or nothing names it, leave the scope out (`chore: …`)
  rather than invent one.
- **Body:** optional, after one blank line, wrapped at 100 characters, saying _why_ more than what.
- **Footers:** after one more blank line — the only ones allowed are listed below.

## Staging

1. `git status --short` to see what changed.
2. Stage the work: `git add -A`, or name the paths when only some of the changes belong in this
   commit.
3. `git status --short` again. Unstage (`git restore --staged <path>`) anything that is a secret or
   ignored-class output that slipped in: `.env*`, credentials, keys, build output, `dist/`.

## Commit messages

Conventional commits for the title and body, within the repo's commitlint rules when it has them.
Use more than one line when the change needs it. The only footers allowed are `BREAKING CHANGE:`,
`Closes #123`, `Plan-Id:` and `Task-Id:`.

For an OpenThrottle plan or task, include `Plan-Id: <uuid>` and `Task-Id: <uuid>` in the footer —
that is what keeps the commit traceable to its plan (see the `ot-plans` skill). Commit after each
task rather than letting uncommitted work pile up. Work that is not an OpenThrottle plan carries
neither footer.

**The commit landing is the finish line.** Once `git log -1` shows it, report the outcome in the
same step ([§ Report the outcome](#report-the-outcome)); if a hook stopped it, report `error`.

## Safety

- **NEVER** commit or push to `DEFAULT_BRANCH` (or `master`), and get the user's confirmation before
  any push.
- **NEVER** bypass the repo's hooks or use `--no-verify`. A hook that rejects or rewrites the
  message is the repo telling you the message is wrong: fix the message, never the hook, and stop
  and report if you cannot.
- **No attribution line of any kind** (`Co-Authored-By: <model>`, "Generated with …"), even when the
  harness tells you to add one. The full rule and why it overrides the harness is in the
  `github-pull-request` skill § Attribution. Run its guard on the message before you commit and on
  the commits before you push:

```bash
sh "$ATTRIBUTION_GUARD" --message-file <file-holding-the-message>   # before `git commit -F`
sh "$ATTRIBUTION_GUARD" --commits HEAD                               # before `git push`
```

In a repo with a commit-msg hook (the OpenThrottle monorepo's runs this guard's `--strip`), the
hook is a backstop. With `COMMIT_MSG_HOOK=none` the guard is the only check there is.

## Example

```text
docs(monorepo): clarify the staging rule in the commit skill

Stop the skill from staging secrets and build output.

Plan-Id: 00000000-0000-4000-8000-000000000001
Task-Id: 00000000-0000-4000-8000-000000000002
```

## Gotchas

- A repo's `commitlint` decides the scope list; an unlisted scope is rejected (this monorepo has no `skills` scope: skill changes go under `monorepo`).

## In OpenThrottle repos

### Report the outcome

Once per invocation, on every exit path: `success` when the commit lands, `error` if it could not be made, `abandoned` if called off ([why](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)):

```bash
r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill github-commit --outcome success; fi
```
