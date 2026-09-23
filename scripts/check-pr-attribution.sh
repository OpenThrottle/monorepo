#!/usr/bin/env sh

# Local backstop for AGENTS.md § No agent attribution, run BEFORE `gh pr create`/
# `gh pr edit` ever publishes a PR title or body.
#
# Why this exists: `gh pr create --body-file <f>` publishes whatever it is
# handed, and the first thing that ever inspected that text used to be the
# `attribution-guard` CI job — which only runs once the PR already exists and
# is visible. A commit message can be silently rewritten by `.husky/commit-msg`
# before it is ever pushed; a published PR body cannot be un-published the same
# way. PR #554 shipped `🤖 Generated with [Claude Code](...)` on body line 39
# and only CI caught it. This script is the check on this side of that gap.
#
# The pattern set is NOT restated here — it is sourced from
# .husky/lib/attribution-patterns.sh, the same file `.husky/commit-msg` and the
# CI `attribution-guard` job both use, so all three can never drift apart.
#
# Shell, not tsx, though `scripts/` is otherwise 53 TS files to 8 shell ones.
# Not because the pattern would be hard to port — the alternation itself
# (`(co-authored-by:|...|🤖)`) is valid in a JS regex byte-for-byte, and it is
# the part that actually changes as new emitters appear. The reasons are:
#
#   1. The ANCHOR does not port, and fails silently. `^[[:space:]]*` is a POSIX
#      bracket expression; JS reads it as a character class of `[ : s p a c e`
#      followed by a literal `]`, so the ported pattern compiles without a
#      throw and then matches nothing:
#        node -e "console.log(new RegExp('^[[:space:]]*(co-authored-by:)','i')\
#          .test('  Co-Authored-By: x'))"  # => false
#      A guard that waves everything through while reporting ✅ is a worse
#      outcome than the drift a second copy would risk.
#   2. The shell file has to exist either way. The CI `attribution-guard` job
#      sparse-checks out .husky/lib/attribution-patterns.sh alone — no install,
#      no Node — so a TS rewrite here would not delete a shell file, it would
#      add a second language reading the same one.
#   3. No runtime at the call site. This runs immediately before
#      `gh pr create`, often in a fresh worktree; `sh` and `grep` are always
#      there, `tsx` needs node_modules. Every other scripts/*.ts is invoked
#      through a package script inside a provisioned checkout. This is not.
#
# Usage:
#   scripts/check-pr-attribution.sh --title-file <path> --body-file <path>
#   scripts/check-pr-attribution.sh --body-file <path>          # title optional
#   printf '%s' "$body" | scripts/check-pr-attribution.sh --body-file -
#
# Exits 0 with no output when clean, non-zero naming the rule and the
# offending line(s) when not. Mirrors the CI job's own `check()` helper and
# messaging so a failure here reads the same way a CI failure would.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

# shellcheck source=../.husky/lib/attribution-patterns.sh
. "$REPO_ROOT/.husky/lib/attribution-patterns.sh"

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

# Report every offending line with its source and line number, so the author
# sees what to delete rather than just a red exit code.
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

# A title is one line, so attribution lands at its end rather than on a line of
# its own — it needs the unanchored pattern. The body is prose and keeps the
# anchored one. Same split as the CI job.
[ -n "$title_file" ] && check "PR title" "$title_file" "$OT_ATTRIBUTION_PATTERN_INLINE"
[ -n "$body_file" ] && check "PR body" "$body_file" "$OT_ATTRIBUTION_PATTERN"

if [ "$failed" -ne 0 ]; then
  echo ""
  echo "🚫 Attribution to a tool, model or assistant is not allowed in a PR"
  echo "   title or body. Remove the line(s) above before running"
  echo "   \`gh pr create\`/\`gh pr edit\`."
  echo ""
  echo "   Rule:  AGENTS.md § No agent attribution"
  echo "   Guard: .husky/lib/attribution-patterns.sh (shared with the commit-msg hook and the CI attribution-guard job)"
  exit 1
fi

echo "✅ No attribution found."
