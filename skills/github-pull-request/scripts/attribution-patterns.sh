#
# Shared agent-attribution pattern set.
#
# Sourced — NOT executed. Sets OT_ATTRIBUTION_PATTERN, a POSIX ERE (use with
# `grep -E -i`) matching any tool/model attribution line we refuse to carry in
# commit messages, PR titles or PR bodies.
#
# This is the single definition. It lives in the github-pull-request skill so
# it travels with the skill into every repo, and the only thing that sources it
# is check-attribution.sh beside it. Everything else runs that guard: the
# github-* skills, the plan-run host, and in the OpenThrottle repo
# .husky/commit-msg (strip), .husky/pre-push and the CI "attribution-guard" job.
#
# Deliberately emitter-agnostic: it is not about any one tool. Claude Code,
# Cursor, Copilot and whatever comes next all emit some variation, and every
# time this was written against one emitter's exact spelling it stopped working
# the moment the emitter changed. Matching is case-insensitive precisely
# because `Co-Authored-By:` slipped past a `Co-authored-by:`-only guard for
# months.
#
# Conventional footers must NOT match: BREAKING CHANGE:, Closes #, Fixes #,
# Plan-Id:, Task-Id:.
#
# ONE literal alternation, two derived patterns — so there is a single place to
# add a new emitter's spelling.
OT_ATTRIBUTION_ALTERNATION='(co-authored-by:|made-with:|generated with |made with |🤖)'

# Line-anchored. Use this for anything with prose paragraphs — a commit message,
# a PR body — where attribution sits on its own line. Anchoring is what keeps
# "a library made with care" in a body from tripping the guard.
OT_ATTRIBUTION_PATTERN="^[[:space:]]*$OT_ATTRIBUTION_ALTERNATION"

# Unanchored. Use this ONLY for single-line fields — a PR title, a commit
# subject — where attribution lands at the END of the line ("feat: thing 🤖")
# and an anchored match would sail straight past it.
OT_ATTRIBUTION_PATTERN_INLINE="$OT_ATTRIBUTION_ALTERNATION"
