# Skip the script if we are in a linked Git worktree
skipIfInWorktree () {
  NAME="${2:-$1}"

  # Linked worktrees use a separate admin directory (.../.git/worktrees/<name>).
  # Primary checkout: --git-dir and --git-common-dir resolve to the same path.
  # Skip environment setup only when cwd is a linked worktree, not the source repo.
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    _git_dir=$(git rev-parse --git-dir)
    _git_common=$(git rev-parse --git-common-dir)
    _git_dir_abs=$(cd "$_git_dir" && pwd -P)
    _git_common_abs=$(cd "$_git_common" && pwd -P)

    if [ "$_git_dir_abs" != "$_git_common_abs" ]; then
      echo "🔸 ♦️ Running from a linked Git worktree - skipping $NAME ♦️ 🔸"
      exit 0

    # else
    #   echo "💚 ♦️ Running from a primary Git checkout - running $NAME ♦️ 💚"
    fi
  fi
}

