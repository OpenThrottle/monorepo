#
# Shared folder-vocabulary gate (staged paths only).
#
# Sourced — NOT executed — so its `exit 1` aborts the calling Husky hook. The
# banned list and allowlist live in ONE place, scripts/check-folder-vocabulary.ts;
# never restate them in shell. Every surface that runs the same rule:
#   - .husky/pre-commit   (this gate: `--staged`, newly added/renamed-to paths)
#   - check:local         (`pnpm run check:local:folder-vocabulary`, whole tree)
#   - .github/workflows/continuous-integration.yml, step
#     "🗂️ Folder vocabulary (no junk-drawer folders)" (CI gate, whole tree)
#
# Deliberately NOT in pre-push: CI runs the whole-tree check, and pre-push is
# already heavy. Calls tsx directly rather than through Nx or `pnpm exec`,
# because commit latency matters and this runs on every commit.
echo "🗂️ Folder vocabulary (staged)"
FOLDER_VOCABULARY_TSX="node_modules/.bin/tsx"
[ -x "$FOLDER_VOCABULARY_TSX" ] || FOLDER_VOCABULARY_TSX="pnpm exec tsx"
if ! $FOLDER_VOCABULARY_TSX ./scripts/check-folder-vocabulary.ts --staged
then
  echo "\n 🚫 Rename the folder per skills/ot-folders/SKILL.md; this is the same rule CI enforces.\n"

  # Exit with a non-zero status code to stop the commit
  exit 1;
fi
