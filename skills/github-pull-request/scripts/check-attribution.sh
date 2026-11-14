#!/usr/bin/env sh

# The attribution guard: finds text that credits a tool, model or assistant ("Generated with …",
# "Made with …", a Co-authored-by line, a robot emoji) in a PR title or body, a commit message,
# or the commits a push would add — and fails, or for a commit message being written, strips it.
#
# This is the only copy. It ships with the github-pull-request skill so every repo the skill is
# synced into gets it, hooks or no hooks. Callers:
#   - github-pull-request / github-commit / github-squash, before they commit, push or publish
#   - the plan-run host (finalizePlanRun), from .agents/skills/github-pull-request/scripts/,
#     before it pushes and before it publishes a PR
#   - in the OpenThrottle repo: .husky/commit-msg (--strip), .husky/pre-push (--push-refs) and the
#     CI attribution-guard job (--title-file / --body-file / --message-file)
# The pattern set is sourced from attribution-patterns.sh beside this file, never restated.
#
# Why strip in one place and fail everywhere else: a commit message being written is still the
# author's private text, and several harnesses inject the line themselves, so failing there would
# teach `--no-verify`. Everything else is about to be published or already pushed — a published
# PR body cannot be un-published — so it fails, loudly, naming each line.
#
# Shell, not tsx, deliberately: the anchor `^[[:space:]]*` is POSIX and silently matches nothing
# if ported to a JS RegExp; CI runs this from a sparse checkout with no install; and it runs right
# before a push or `gh pr create`, often in a repo that is not ours, where `sh`, `grep` and `git`
# are always present.
#
# Usage (modes combine, except --strip):
#   check-attribution.sh --title-file <f>          one-line PR title (unanchored pattern)
#   check-attribution.sh --body-file <f|->         PR body (line-anchored pattern)
#   check-attribution.sh --message-file <f>        a commit message; repeatable
#   check-attribution.sh --commits <rev>           every commit reachable from <rev> and no
#                                                  remote ref — what pushing <rev> would add
#   check-attribution.sh --push-refs <f|->         git pre-push stdin ("<local_ref> <local_sha>
#                                                  <remote_ref> <remote_sha>" per line)
#   check-attribution.sh --strip <f>               remove matching lines from a commit message in
#                                                  place and say what went; always exits 0
#
# Exits 0 when clean, 1 naming every offending line when not, 2 on bad usage.

set -eu

SCRIPT_DIR=$(CDPATH='' cd -P -- "$(dirname -- "$0")" && pwd)

# shellcheck source=./attribution-patterns.sh
. "$SCRIPT_DIR/attribution-patterns.sh"

ZERO='0000000000000000000000000000000000000000'

usage() {
  echo "Usage: $0 [--title-file <f>] [--body-file <f|->] [--message-file <f>]..." >&2
  echo "          [--commits <rev>] [--push-refs <f|->] | --strip <f>" >&2
  exit 2
}

title_file=""
body_file=""
message_files=""
commits_rev=""
push_refs=""
strip_file=""

while [ $# -gt 0 ]; do
  [ $# -ge 2 ] || usage
  case "$1" in
    --title-file) title_file="$2" ;;
    --body-file) body_file="$2" ;;
    --message-file) message_files="$message_files$2
" ;;
    --commits) commits_rev="$2" ;;
    --push-refs) push_refs="$2" ;;
    --strip) strip_file="$2" ;;
    *) usage ;;
  esac
  shift 2
done

# --- strip: the one mode that rewrites instead of failing --------------------------------------
if [ -n "$strip_file" ]; then
  if [ -n "$title_file$body_file$message_files$commits_rev$push_refs" ]; then
    usage
  fi
  [ -f "$strip_file" ] || exit 0
  if stripped="$(grep -inE "$OT_ATTRIBUTION_PATTERN" "$strip_file")"; then
    echo "✂️  Removed agent attribution from the commit message:"
    echo "$stripped" | sed 's/^/     line /'
    echo "   Rule:  No agent attribution — commits carry only conventional footers"
    echo "          (BREAKING CHANGE:, Closes #, Plan-Id:, Task-Id:)."
    echo "   Guard: skills/github-pull-request/scripts/check-attribution.sh"
    echo "   The commit itself is fine — the line is gone. Nothing to redo."
    grep -viE "$OT_ATTRIBUTION_PATTERN" "$strip_file" > "$strip_file.stripped" || true
    mv "$strip_file.stripped" "$strip_file"
  fi
  exit 0
fi

if [ -z "$title_file$body_file$message_files$commits_rev$push_refs" ]; then
  usage
fi

# A file, not a variable: findings are appended from inside loops, and one of them (the push-refs
# read) runs in a subshell on some shells, where a variable set inside would be invisible here.
report="$(mktemp)"
stdin_copy="$(mktemp)"
trap 'rm -f "$report" "$stdin_copy"' EXIT
kinds=""

# check <label> <file> <pattern>: append every offending line to the report.
check() {
  if hits="$(grep -inE "$3" "$2")"; then
    {
      echo "❌ $1"
      echo "$hits" | sed 's/^/     line /'
    } >> "$report"
  fi
  true
}

# resolve <path|->: sets RESOLVED to the file to read; `-` (stdin) is copied to a temp file. Called
# directly, never in $( ), so a missing file really exits 2 instead of passing as "no hits".
resolve() {
  if [ "$1" = "-" ]; then
    cat > "$stdin_copy"
    RESOLVED="$stdin_copy"
    return
  fi
  if [ ! -f "$1" ]; then
    echo "no such file: $1" >&2
    exit 2
  fi
  RESOLVED="$1"
}

# commit_range <new> <old>: the commits a push of <new> would add — reachable from it but from no
# remote ref. Never "<old>..<new>" alone: after a rebase onto a newer default branch that range
# includes every commit the base gained, which already landed and are not this push's to answer.
commit_range() {
  if [ "$2" = "$ZERO" ]; then
    git rev-list "$1" --not --remotes
  else
    git rev-list "$1" --not "$2" --remotes
  fi
}

# check_commits <new> <old>: check the message of each commit in that range.
check_commits() {
  msg="$(mktemp)"
  for sha in $(commit_range "$1" "$2"); do
    git log -1 --format=%B "$sha" > "$msg"
    check "commit $(git rev-parse --short "$sha")  $(git log -1 --format=%s "$sha")" "$msg" \
      "$OT_ATTRIBUTION_PATTERN"
  done
  rm -f "$msg"
}

# A title is one line, so attribution lands at its end — unanchored pattern. Bodies and messages
# are prose and keep the line-anchored one, so "a library made with care" does not trip it.
if [ -n "$title_file" ]; then
  resolve "$title_file"
  check "PR title" "$RESOLVED" "$OT_ATTRIBUTION_PATTERN_INLINE"
  kinds="$kinds pr"
fi
if [ -n "$body_file" ]; then
  resolve "$body_file"
  check "PR body" "$RESOLVED" "$OT_ATTRIBUTION_PATTERN"
  kinds="$kinds pr"
fi
if [ -n "$message_files" ]; then
  # One path per line; split on newlines only, with globbing off, in this shell (not a pipe).
  set -f
  old_ifs=$IFS
  IFS='
'
  for file in $message_files; do
    resolve "$file"
    check "commit message $(basename "$file")" "$RESOLVED" "$OT_ATTRIBUTION_PATTERN"
  done
  IFS=$old_ifs
  set +f
  kinds="$kinds message"
fi
if [ -n "$commits_rev" ]; then
  git rev-parse --verify --quiet "$commits_rev^{commit}" > /dev/null \
    || { echo "not a commit: $commits_rev" >&2; exit 2; }
  check_commits "$(git rev-parse "$commits_rev")" "$ZERO"
  kinds="$kinds commits"
fi
if [ -n "$push_refs" ]; then
  resolve "$push_refs"
  refs_file="$RESOLVED"
  # A ref deletion pushes the all-zero local sha and carries no commits. The `|| [ -n … ]` keeps a
  # last line with no trailing newline, which a plain `read` silently drops.
  while IFS=' ' read -r _local_ref local_sha _remote_ref remote_sha || [ -n "${local_sha:-}" ]; do
    if [ -z "$local_sha" ] || [ "$local_sha" = "$ZERO" ]; then
      continue
    fi
    check_commits "$local_sha" "${remote_sha:-$ZERO}"
  done < "$refs_file"
  kinds="$kinds commits"
fi

if [ ! -s "$report" ]; then
  echo "✅ No attribution found."
  exit 0
fi

cat "$report"
echo ""
echo "🚫 Attribution to a tool, model or assistant is not allowed — credit the logged-in"
echo "   GitHub user only; the only footers are BREAKING CHANGE:, Closes #, Plan-Id:, Task-Id:."
case "$kinds" in
  *pr*) echo "   PR text: remove the line(s) above before \`gh pr create\`/\`gh pr edit\`." ;;
esac
case "$kinds" in
  *message*) echo "   Message: remove the line(s) above before committing." ;;
esac
case "$kinds" in
  *commits*) echo "   Commits: reword each one listed (\`git rebase -i\`, or \`git commit --amend\` for the tip), then push again." ;;
esac
echo ""
echo "   Rule:  No agent attribution"
echo "   Guard: skills/github-pull-request/scripts/check-attribution.sh"
exit 1
