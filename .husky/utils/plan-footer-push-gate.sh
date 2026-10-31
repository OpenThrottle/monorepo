#
# Shared plan-footer check for `git push` — WARN ONLY.
#
# Sourced — NOT executed — from .husky/pre-push, after the attribution gate.
# Lists the commits this push would add that carry no `Plan-Id:` footer, so
# work started outside an OpenThrottle plan is visible before it leaves the
# machine.
#
# Why git, and why here: the plan-first rule (AGENTS.md § Plans in OT only) is
# enforced at session kickoff only where a harness exposes a hook for it — see
# docs/monorepo/agent-cli-hook-capability-matrix.md § Session kickoff guard. Git
# is the one layer every agent tool and every person goes through, so this is
# the check that applies regardless of harness.
#
# Why it never fails the push: human branches, dependency bumps and quick fixes
# legitimately have no plan, and failing them would teach people to reach for
# --no-verify, which AGENTS.md forbids. It reports; it never decides.
#
# Opt out with OPENTHROTTLE_PLAN_FOOTER_GATE=0.
#
# The caller must set OT_PUSH_REFS to the raw pre-push stdin (one
# "<local_ref> <local_sha> <remote_ref> <remote_sha>" line per ref) BEFORE
# sourcing this: stdin is consumed once, and reading it here would leave later
# gates in the same hook nothing to read.

if [ "${OPENTHROTTLE_PLAN_FOOTER_GATE:-1}" != "0" ]; then
  echo "🧭 Plan footer check (pushed commits, warn only)"

  ot_plan_footer_zero='0000000000000000000000000000000000000000'
  # A file, not a shell variable: the read loop below runs in a subshell on
  # every POSIX shell, so anything assigned inside it is invisible out here.
  ot_plan_footer_report="$(mktemp)"

  # The commits this push would actually add — the same range the attribution
  # gate uses, for the same reason: "$2..$1" alone after a rebase onto a newer
  # main would include every commit main gained since. Merge commits are
  # skipped; they carry no footers of their own.
  ot_plan_footer_range() {
    if [ "$2" = "$ot_plan_footer_zero" ]; then
      git rev-list --no-merges "$1" --not --remotes
    else
      git rev-list --no-merges "$1" --not "$2" --remotes
    fi
  }

  echo "$OT_PUSH_REFS" | while IFS=' ' read -r _local_ref local_sha _remote_ref remote_sha; do
    # A ref deletion pushes the all-zero local sha and carries no commits.
    if [ -z "$local_sha" ] || [ "$local_sha" = "$ot_plan_footer_zero" ]; then
      continue
    fi

    for sha in $(ot_plan_footer_range "$local_sha" "$remote_sha"); do
      if ! git log -1 --format=%B "$sha" | grep -qE '^Plan-Id:[[:space:]]*[^[:space:]]'; then
        echo "⚠️  commit $(git rev-parse --short "$sha")  $(git log -1 --format=%s "$sha")" >> "$ot_plan_footer_report"
      fi
    done
  done

  if [ -s "$ot_plan_footer_report" ]; then
    cat "$ot_plan_footer_report"
    echo ""
    echo " 🧭 The commits above carry no Plan-Id: footer. If this is substantive work,"
    echo "    file it as an OpenThrottle plan and carry Plan-Id: / Task-Id: in the commit."
    echo "    How: skills/ot-plans/SKILL.md § Follow-ups and session kickoff"
    echo "    This check never blocks a push; silence it with OPENTHROTTLE_PLAN_FOOTER_GATE=0."
    echo ""
  fi

  rm -f "$ot_plan_footer_report"
fi
