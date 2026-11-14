#!/usr/bin/env sh

# PR attribution guard, run BEFORE `gh pr create`/`gh pr edit` publishes a PR title or body.
#
# Fails when a drafted title or body credits a tool, model or assistant ("Generated with …",
# "Made with …", a Co-authored-by line, a robot emoji). This is the only copy of the guard: the
# github-pull-request skill runs it in any repo it is synced into, and the plan-run host
# (finalizePlanRun) runs it from <repo>/.agents/skills/github-pull-request/scripts/ before it
# publishes — the skill fan-out in the OpenThrottle repo, the injected overlay everywhere else.
#
# Why this exists: `gh pr create --body-file <f>` publishes whatever it is handed, and the first
# thing that ever inspected that text used to be the `attribution-guard` CI job — which only runs
# once the PR already exists and is visible. A commit message can be silently rewritten by a
# commit-msg hook before it is ever pushed; a published PR body cannot be un-published the same
# way. PR #554 shipped `🤖 Generated with [Claude Code](...)` on body line 39 and only CI caught
# it. This script is the check on this side of that gap.
#
# The pattern set is NOT restated here — it is sourced from attribution-patterns.sh beside this
# file, the same file the monorepo's commit-msg hook, pre-push gate and CI job source.
#
# Shell, not tsx, deliberately:
#   1. The ANCHOR does not port, and fails silently. `^[[:space:]]*` is a POSIX bracket
#      expression; JS reads it as a character class of `[ : s p a c e` followed by a literal
#      `]`, so a ported pattern compiles without a throw and then matches nothing. A guard that
#      waves everything through while reporting ✅ is worse than no guard.
#   2. The CI job sparse-checks out the pattern file alone — no install, no Node — so the
#      pattern file has to be shell either way.
#   3. No runtime at the call site. This runs right before `gh pr create`, often in a fresh
#      worktree or a repo that is not ours; `sh` and `grep` are always there, `tsx` is not.
#
# Usage:
#   sh check-pr-attribution.sh --title-file <path> --body-file <path>
#   sh check-pr-attribution.sh --body-file <path>          # title optional
#   printf '%s' "$body" | sh check-pr-attribution.sh --body-file -
#
# Exits 0 when clean, 1 naming the offending line(s) when not, 2 on bad usage. Mirrors the CI
# job's own messaging so a failure here reads the same way a CI failure would.

set -eu

SCRIPT_DIR=$(CDPATH='' cd -P -- "$(dirname -- "$0")" && pwd)

# shellcheck source=./attribution-patterns.sh
. "$SCRIPT_DIR/attribution-patterns.sh"

usage() {
  echo "Usage: $0 [--title-file <path>] [--body-file <path>|-]" >&2
  exit 2
}

title_file=""
body_file=""

while [ $# -gt 0 ]; do
  case "$1" in
    --title-file)
      [ $# -ge 2 ] || usage
      title_file="$2"
      shift 2
      ;;
    --body-file)
      [ $# -ge 2 ] || usage
      body_file="$2"
      shift 2
      ;;
    *)
      usage
      ;;
  esac
done

if [ -z "$title_file" ] && [ -z "$body_file" ]; then
  usage
fi

failed=0

# Report every offending line with its source and line number, so the author sees what to
# delete rather than just a red exit code.
check() {
  label="$1"
  file="$2"
  pattern="$3"

  if [ "$file" = "-" ]; then
    src="$(mktemp)"
    cat > "$src"
  else
    if [ ! -f "$file" ]; then
      echo "$label: no such file: $file" >&2
      exit 2
    fi
    src="$file"
  fi

  if hits="$(grep -inE "$pattern" "$src")"; then
    failed=1
    echo "❌ $label"
    echo "$hits" | sed 's/^/     line /'
  fi

  [ "$file" = "-" ] && rm -f "$src"
  true
}

# A title is one line, so attribution lands at its end — unanchored pattern. A body is prose and
# keeps the line-anchored one, so "a library made with care" does not trip it. Same split as
# the CI job.
[ -n "$title_file" ] && check "PR title" "$title_file" "$OT_ATTRIBUTION_PATTERN_INLINE"
[ -n "$body_file" ] && check "PR body" "$body_file" "$OT_ATTRIBUTION_PATTERN"

if [ "$failed" -ne 0 ]; then
  echo ""
  echo "🚫 Attribution to a tool, model or assistant is not allowed in a PR"
  echo "   title or body. Remove the line(s) above before running"
  echo "   \`gh pr create\`/\`gh pr edit\`."
  echo ""
  echo "   Rule:  No agent attribution — a PR credits the logged-in GitHub user only"
  echo "   Guard: skills/github-pull-request/scripts/attribution-patterns.sh"
  exit 1
fi

echo "✅ No attribution found."
