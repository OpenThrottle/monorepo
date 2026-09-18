#!/bin/bash
# ot-skill-sync — verify every relative link in a skill body resolves.
#
# The layout checks in sync.sh --check never open a SKILL.md. That blind spot is
# how three separate classes of dead pointer accumulated in this repo unnoticed
# (OT 6aec86bf), and how the rules-layer retirement swept every well-formed
# reference to `.agents/rules/` while leaving four malformed ones behind: a grep
# for the correct path cannot see a link that is wrong.
#
# So this resolves rather than pattern-matches. A relative link is checked from
# the directory of the file that contains it — which is the only question worth
# asking, needs no allowlist to maintain, and keeps working after any path
# convention changes. Deliberately NOT a denylist of banned path prefixes; see
# the skill body, § What --check validates, for why that was rejected.
#
# Usage:
#   check-links.sh           # exit 1 and list every unresolved target
#
# Skipped by design: absolute URLs, mailto:, bare `#anchor` links, and anything
# inside a fenced code block (those are examples, not pointers). Fragments and
# query strings are stripped before the path is resolved; the anchor itself is
# not validated.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

detect_repo_root

# Same ladder as package.json: the authoring repo keeps skills in skills/, a repo
# that installed them with `npx skills` has only the universal dir.
SRC="$SKILLS_SRC_DIR"
[ -d "$REPO_ROOT/$SRC" ] || SRC="$UNIVERSAL_DIR"
if [ ! -d "$REPO_ROOT/$SRC" ]; then
  echo -e "${YELLOW}No skills directory found — nothing to check${NC}"
  exit 0
fi

echo -e "${GREEN}Checking skill links in: $REPO_ROOT/$SRC${NC}"

# -L so an installed repo's symlinked skill dirs are followed. Links are resolved
# from the file's real location, which is what a reader on GitHub sees.
# `node_modules` is excluded because a skill may carry its own package.json for
# CI validation (e.g. skills/ot-telemetry) — its installed dependencies' READMEs
# are not skill bodies and their links are not this script's concern.
FILES=$(find -L "$REPO_ROOT/$SRC" -name '*.md' -type f -not -path '*/node_modules/*' | sort)

# awk emits one `path<TAB>line<TAB>target` record per candidate link, with fenced
# code blocks excluded. Existence is tested in bash, where a failure can be
# reported against the file and line that produced it.
CANDIDATES=$(printf '%s\n' "$FILES" | while IFS= read -r f; do
  [ -n "$f" ] || continue
  awk -v path="$f" '
    /^[[:space:]]*(```|~~~)/ { fence = !fence; next }
    fence { next }
    {
      rest = $0
      while (match(rest, /\]\([^)[:space:]]+\)/)) {
        target = substr(rest, RSTART + 2, RLENGTH - 3)
        rest = substr(rest, RSTART + RLENGTH)
        if (target ~ /^[a-zA-Z][a-zA-Z0-9+.-]*:/) continue   # scheme: http, mailto, …
        if (target ~ /^[#?]/) continue                        # same-document anchor
        sub(/[#?].*$/, "", target)                            # strip fragment / query
        if (target == "") continue
        printf "%s\t%d\t%s\n", path, NR, target
      }
    }
  ' "$f"
done)

FAILED=0
while IFS=$'\t' read -r file line target; do
  [ -n "${file:-}" ] || continue
  case "$target" in
    /*) resolved="$REPO_ROOT$target" ;;                       # repo-root-relative
    *)  resolved="$(dirname "$file")/$target" ;;
  esac
  if [ ! -e "$resolved" ]; then
    rel="${file#"$REPO_ROOT"/}"
    echo -e "- ${RED}✖ $rel:$line${NC} → $target"
    FAILED=$((FAILED + 1))
  fi
done <<< "$CANDIDATES"

echo
if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}❌ $FAILED unresolved link(s) in skill bodies${NC}"
  echo -e "   A link is resolved from the directory of the file containing it."
  echo -e "   Skills are authored in $SRC/ — a link written to resolve from a"
  echo -e "   generated copy under $UNIVERSAL_DIR/ will be off by one path segment."
  exit 1
fi

echo -e "${GREEN}✅ Every relative link in a skill body resolves${NC}"
