#!/usr/bin/env sh

# Bundled PR attribution guard for github-pull-request, for repos that have no guard of their own.
#
# Fails when a drafted PR title or body credits a tool, model or assistant ("Generated with …",
# "Made with …", a Co-authored-by line, a robot emoji). Run it BEFORE `gh pr create`/`gh pr edit`:
# a published PR body cannot be un-published.
#
# The pattern set lives in the sibling attribution-patterns.sh, a byte-identical copy of the
# OpenThrottle monorepo's .husky/utils/attribution-patterns.sh. Shell and POSIX grep only, so it
# needs no install and runs in any checkout.
#
# Usage:
#   sh check-pr-attribution.sh --title-file <path> --body-file <path>
#   sh check-pr-attribution.sh --body-file <path>          # title optional
#   printf '%s' "$body" | sh check-pr-attribution.sh --body-file -
#
# Exits 0 when clean, 1 naming the offending line(s) when not, 2 on bad usage.

set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)

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
# keeps the line-anchored one, so "a library made with care" does not trip it.
[ -n "$title_file" ] && check "PR title" "$title_file" "$OT_ATTRIBUTION_PATTERN_INLINE"
[ -n "$body_file" ] && check "PR body" "$body_file" "$OT_ATTRIBUTION_PATTERN"

if [ "$failed" -ne 0 ]; then
  echo ""
  echo "🚫 Attribution to a tool, model or assistant is not allowed in a PR"
  echo "   title or body. Remove the line(s) above before running"
  echo "   \`gh pr create\`/\`gh pr edit\`."
  exit 1
fi

echo "✅ No attribution found."
