#!/usr/bin/env sh

# Fails when a file vendored into a skill no longer matches its canonical copy.
#
# Skills are synced into repos that are not this monorepo, so a skill cannot reach a sibling
# skill or a repo file with a relative path — it has to carry its own copy. Copies drift, so
# each one is listed here against its source and compared byte-for-byte.
#
# Fix a failure by copying the canonical file over the copy (the message prints the command).
#
# Usage: sh scripts/check-vendored-skill-files.sh   (from the repo root; run by
#        monorepo:check-agent-assets-ssot)

set -eu

cd "$(git rev-parse --show-toplevel)"

# canonical<TAB>copy, one pair per line.
pairs='skills/github-pull-request/scripts/resolve-repo-context.sh	skills/github-commit/scripts/resolve-repo-context.sh
skills/github-pull-request/scripts/resolve-repo-context.sh	skills/github-squash/scripts/resolve-repo-context.sh
skills/github-pull-request/scripts/resolve-repo-context.sh	skills/github-cleanup/scripts/resolve-repo-context.sh
.husky/utils/attribution-patterns.sh	skills/github-pull-request/scripts/attribution-patterns.sh'

failed=0
tab=$(printf '\t')

while IFS="$tab" read -r canonical copy; do
  [ -n "$canonical" ] || continue
  if [ ! -f "$canonical" ]; then
    echo "❌ canonical file missing: $canonical"
    failed=1
    continue
  fi
  if [ ! -f "$copy" ] || ! cmp -s "$canonical" "$copy"; then
    echo "❌ $copy differs from $canonical"
    echo "     fix: cp $canonical $copy"
    failed=1
  fi
done <<EOF
$pairs
EOF

if [ "$failed" -ne 0 ]; then
  echo ""
  echo "🚫 Vendored skill files drifted from their canonical copies."
  exit 1
fi

echo "✅ Vendored skill files match their canonical copies."
