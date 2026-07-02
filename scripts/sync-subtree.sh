#!/usr/bin/env bash
set -euo pipefail

################################################################################
#
#   sync-subtree.sh — publish a monorepo subdirectory to the ROOT of a
#   standalone remote repo's branch.
#
#   Usage:
#     scripts/sync-subtree.sh <prefix> <remote> [branch] [--force]
#
#   Example:
#     scripts/sync-subtree.sh applications/openthrottle openthrottle main
#     scripts/sync-subtree.sh applications/openthrottle openthrottle main --force
#
#   Why not `git subtree push`?
#   This repo's history carries stale `git-subtree-dir:` / `git-subtree-split:`
#   annotations (left over from when `applications/openthrottle/` lived at
#   `openthrottle/`). `git subtree split` trusts those markers and silently
#   stops walking early — so the split SHA never advances and pushes are no-ops,
#   even with --ignore-joins and a wiped .git/subtree-cache.
#
#   Instead we publish the EXACT current tree of <prefix> as a single snapshot
#   commit. By default it is parented on the remote's current branch tip so the
#   push fast-forwards (non-destructive). With --force the snapshot is an orphan
#   commit that overwrites the remote branch.
#
#   Note: only files tracked by git are published. Anything gitignored under
#   <prefix> (e.g. .env) is never pushed.
#
################################################################################

source_ref="main"

prefix="${1:?prefix required, e.g. applications/openthrottle}"
remote="${2:?remote required, e.g. openthrottle}"
branch="${3:-main}"
force="${4:-}"

tree="$(git rev-parse "${source_ref}:${prefix}")"
short="$(git rev-parse --short "${source_ref}")"
message="chore: sync ${prefix} from monorepo

Snapshot of ${prefix} at monorepo ${source_ref} ${short}."

if [ "${force}" = "--force" ]; then
  commit="$(git commit-tree "${tree}" -m "${message}")"
  echo "Force-pushing ${prefix} (${tree}) -> ${remote}/${branch} as orphan ${commit}"
  git push --force "${remote}" "${commit}:refs/heads/${branch}"
else
  git fetch "${remote}"
  parent="$(git rev-parse "${remote}/${branch}")"
  commit="$(git commit-tree "${tree}" -p "${parent}" -m "${message}")"
  echo "Fast-forward push ${prefix} (${tree}) -> ${remote}/${branch} as ${commit} (parent ${parent})"
  git push "${remote}" "${commit}:refs/heads/${branch}"
fi
