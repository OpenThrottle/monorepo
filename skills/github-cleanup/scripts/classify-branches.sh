#!/usr/bin/env bash
# classify-branches.sh — read-only report of which local branches are safe to delete.
#
# Prints one tab-separated row per local branch (except the default branch):
#   VERDICT  BRANCH  PR  REASON  WORKTREE  DIRTY
#
#   SAFE    every change on the branch is on the default branch: the tip is an ancestor of
#           it, the tip is contained in a merged PR's head, or every file the branch changed
#           reached the default branch with exactly that content (how a squash merge shows up)
#   REVIEW  some, but not all, of the branch's file contents reached the default branch —
#           typical of a squash that picked up fixups; run --explain <branch> and look
#   KEEP    open PR, checked out here, no shared history, or work found nowhere else
#
#   PR        "#<n> <STATE>" of the newest PR from that branch name, or "-"
#   WORKTREE  path of the worktree that has the branch checked out, or "-"
#   DIRTY     "-" when clean, else "<tracked> tracked, <untracked> untracked"
#
# --explain <branch> prints the files whose branch content was never on the default branch.
#
# Read-only on branches, worktrees and working trees. It runs `git fetch --prune`, and it
# fetches merged PR heads into refs/github-cleanup/*, which it deletes again on exit.
#
# Usage: classify-branches.sh [--remote <name>] [--no-fetch] [--explain <branch>]
# Requires: git, gh (authenticated, for PR state), jq.

set -euo pipefail

remote=origin
fetch=1
explain=
while [ $# -gt 0 ]; do
  case "$1" in
    --remote) remote="$2"; shift 2 ;;
    --no-fetch) fetch=0; shift ;;
    --explain) explain="$2"; shift 2 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

for bin in git gh jq; do
  command -v "$bin" >/dev/null || { echo "missing required tool: $bin" >&2; exit 2; }
done

cd "$(git rev-parse --show-toplevel)"

work=$(mktemp -d "${TMPDIR:-/tmp}/github-cleanup.XXXXXX")
cleanup() {
  git for-each-ref --format='%(refname)' refs/github-cleanup/ | while read -r ref; do
    git update-ref -d "$ref"
  done
  rm -rf "$work"
}
trap cleanup EXIT

[ "$fetch" = 0 ] || git fetch "$remote" --prune --quiet

default=$(git symbolic-ref --quiet --short "refs/remotes/$remote/HEAD" 2>/dev/null | sed "s#^$remote/##" || true)
[ -n "$default" ] || default=main
base="$remote/$default"
git rev-parse --verify --quiet "$base" >/dev/null || { echo "cannot resolve $base" >&2; exit 2; }

# landed <from> <tip> <missing-file>: prints "<hit> <total>" — of the files changed between
# <from> and <tip>, how many had exactly the tip's content (or were deleted) at some
# first-parent commit of the base after <from>. Misses are written to <missing-file>.
landed() {
  local from=$1 tip=$2 missing=$3
  # --raw lines look like ":<mode> <mode> <old-blob> <new-blob> <status>\t<path>"
  git log --first-parent --raw --no-abbrev --no-renames --format= "$from..$base" >"$work/base.raw"
  git diff --raw --no-abbrev --no-renames "$from" "$tip" >"$work/branch.raw"
  awk -F'\t' -v missing="$missing" '
    FNR == NR {
      split($1, m, " ")
      if (m[5] == "D") deleted[$2] = 1; else blobs[m[4]] = 1
      next
    }
    {
      split($1, m, " ")
      total++
      if (m[5] == "D" ? ($2 in deleted) : (m[4] in blobs)) hit++
      else print m[5] "\t" $2 > missing
    }
    END { printf "%d %d\n", hit, total; close(missing) }
  ' "$work/base.raw" "$work/branch.raw"
  [ -f "$missing" ] || : >"$missing"
}

if [ -n "$explain" ]; then
  tip=$(git rev-parse --verify "refs/heads/$explain")
  mb=$(git merge-base "$tip" "$base") || { echo "$explain shares no history with $base" >&2; exit 1; }
  read -r hit total <<<"$(landed "$mb" "$tip" "$work/missing")"
  echo "$explain: $hit of $total changed files reached $base with the branch's content"
  echo "not found on $base (compare with: git diff $base $explain -- <file>):"
  cat "$work/missing"
  exit 0
fi

current=$(git symbolic-ref --quiet --short HEAD || echo "")
gh pr list --state all --limit 2000 --json number,headRefName,state,headRefOid >"$work/prs.json"

# branch<TAB>path for every worktree that has a branch checked out
git worktree list --porcelain | awk '
  /^worktree / { path = substr($0, 10) }
  /^branch refs\/heads\// { sub("^branch refs/heads/", ""); print $0 "\t" path }
' >"$work/worktrees.tsv"

printf 'VERDICT\tBRANCH\tPR\tREASON\tWORKTREE\tDIRTY\n'

git for-each-ref --format='%(refname:short)' refs/heads/ | while read -r branch; do
  [ "$branch" = "$default" ] && continue
  tip=$(git rev-parse "refs/heads/$branch")

  wt=$(awk -F'\t' -v b="$branch" '$1 == b { print $2 }' "$work/worktrees.tsv")
  dirty=-
  if [ -n "$wt" ] && [ -d "$wt" ]; then
    tracked=$(git -C "$wt" status --porcelain --untracked-files=no | wc -l | tr -d ' ')
    untracked=$(git -C "$wt" status --porcelain | grep -c '^??' || true)
    [ "$tracked$untracked" = 00 ] || dirty="$tracked tracked, $untracked untracked"
  fi
  [ -n "$wt" ] || wt=-

  num=; state=; prsha=
  pr=$(jq -r --arg b "$branch" '
    [.[] | select(.headRefName == $b)] | sort_by(.number) | last
    | if . == null then "" else "\(.number) \(.state) \(.headRefOid)" end' "$work/prs.json")
  [ -z "$pr" ] || read -r num state prsha <<<"$pr"
  prlabel=-
  [ -z "$num" ] || prlabel="#$num $state"

  verdict=KEEP
  mb=$(git merge-base "$tip" "$base" 2>/dev/null || true)
  if [ "$branch" = "$current" ]; then
    reason="checked out in this worktree"
  elif [ -z "$mb" ]; then
    reason="shares no history with $base (another remote?)"
  elif git merge-base --is-ancestor "$tip" "$base"; then
    verdict=SAFE; reason="every commit is on $base"
  elif [ "$state" = OPEN ]; then
    reason="PR is open"
  else
    if [ "$state" = MERGED ] && ! git cat-file -e "$prsha^{commit}" 2>/dev/null; then
      git fetch --quiet "$remote" "pull/$num/head:refs/github-cleanup/pr-$num" 2>/dev/null || true
    fi
    if [ "$state" = MERGED ] && git cat-file -e "$prsha^{commit}" 2>/dev/null \
      && git merge-base --is-ancestor "$tip" "$prsha"; then
      verdict=SAFE; reason="PR merged; branch has nothing beyond the PR head"
    else
      read -r hit total <<<"$(landed "$mb" "$tip" "$work/missing")"
      ahead=$(git rev-list --count "$mb..$tip")
      if [ "$total" -gt 0 ] && [ "$hit" = "$total" ]; then
        verdict=SAFE; reason="all $total changed files reached $base (squash-merged)"
      elif [ "$hit" -gt 0 ]; then
        verdict=REVIEW; reason="$hit of $total changed files reached $base"
      elif [ "$state" = CLOSED ]; then
        reason="PR closed unmerged; $ahead commit(s) found nowhere on $base"
      else
        reason="no PR; $ahead commit(s) found nowhere on $base"
      fi
      [ "$state" != MERGED ] || [ "$verdict" = SAFE ] || reason="PR merged, but $reason"
    fi
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$verdict" "$branch" "$prlabel" "$reason" "$wt" "$dirty"
done
