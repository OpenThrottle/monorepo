#
# Shared agent-attribution gate for `git push`.
#
# Sourced — NOT executed — so its `exit 1` aborts the calling Husky hook. Same
# arrangement as component-shape-gate.sh, and the pattern set is sourced from
# attribution-patterns.sh rather than restated, so every consumer sees one
# definition:
#   - .husky/commit-msg   (strips, and says what it stripped)
#   - .husky/pre-push     (this gate — fails the push)
#   - scripts/check-pr-attribution.sh  (the drafted PR title and body)
#   - .github/workflows/continuous-integration.yml, job "attribution-guard"
#
# Why a push-time gate exists at all, given commit-msg already strips: the strip
# only runs when the commit-msg hook runs. `git commit --no-verify` skips it, and
# that is exactly how PR #554 shipped an attribution line — a squash commit made
# with --no-verify carried a line the three per-task commits never had. A push is
# the last local moment before the text becomes someone else's problem, so this
# is where a commit that dodged the strip gets caught.
#
# The caller must set OT_PUSH_REFS to the raw pre-push stdin (one
# "<local_ref> <local_sha> <remote_ref> <remote_sha>" line per ref) BEFORE
# sourcing this: stdin is consumed once, and reading it here would leave later
# gates in the same hook nothing to read.

. "$(dirname "$0")/lib/attribution-patterns.sh"

echo "🚫 Attribution gate (pushed commits)"

ot_attribution_zero='0000000000000000000000000000000000000000'
# A file, not a shell variable: the read loop below runs in a subshell on every
# POSIX shell, so a flag assigned inside it is invisible out here.
ot_attribution_report="$(mktemp)"

# The commits this push would actually add. A brand-new branch reports the
# all-zero remote sha and so has no range to diff — fall back to "reachable from
# the new head but from no remote", which is the same set without inventing a
# base branch that may not be the one it forked from.
ot_attribution_range() {
  if [ "$2" = "$ot_attribution_zero" ]; then
    git rev-list "$1" --not --remotes
  else
    git rev-list "$2..$1"
  fi
}

echo "$OT_PUSH_REFS" | while IFS=' ' read -r _local_ref local_sha _remote_ref remote_sha; do
  # A ref deletion pushes the all-zero local sha and carries no commits.
  if [ -z "$local_sha" ] || [ "$local_sha" = "$ot_attribution_zero" ]; then
    continue
  fi

  for sha in $(ot_attribution_range "$local_sha" "$remote_sha"); do
    if hits="$(git log -1 --format=%B "$sha" | grep -inE "$OT_ATTRIBUTION_PATTERN")"; then
      {
        echo "❌ commit $(git rev-parse --short "$sha")  $(git log -1 --format=%s "$sha")"
        echo "$hits" | sed 's/^/     line /'
      } >> "$ot_attribution_report"
    fi
  done
done

if [ -s "$ot_attribution_report" ]; then
  cat "$ot_attribution_report"
  rm -f "$ot_attribution_report"

  echo ""
  echo " 🚫 A commit in this push attributes work to a tool, model or assistant."
  echo "    '.husky/commit-msg' strips these as a commit is written, so a commit"
  echo "    carrying one got here past that hook — usually --no-verify, which"
  echo "    AGENTS.md forbids for exactly this reason."
  echo ""
  echo "    Fix:   git rebase -i  (reword the commits listed above), then push again."
  echo "    Rule:  AGENTS.md § No agent attribution"
  echo "    Guard: .husky/lib/attribution-patterns.sh (shared with commit-msg, the PR-body guard and CI)"
  echo ""

  # Exit with a non-zero status code to stop the push
  exit 1;
fi

rm -f "$ot_attribution_report"
