#
# Shared personal-skills staging gate.
#
# Sourced — NOT executed — so its `exit 1` aborts the calling Husky hook.
#
# Personal skills (docs/monorepo/foreign-workspace-skill-injection.md §7) live
# outside the repo at ~/.openthrottle/skills and appear here only as generated
# symlinks under .agents/skills/ and the agent fan-out dirs. The managed
# .gitignore block already covers those paths, but "it happens to be ignored" is
# not a guarantee — `git add -f` defeats it, and a staged link would commit a
# path pointing at a directory nobody else has. This gate is the second lock.
#
# It fires only when the personal root exists, so on CI and on a machine with no
# personal tier it is a no-op that costs one directory test.
#
# The right way to ship a personal skill is `personal.sh promote <name>`, which
# moves it into skills/ and re-syncs. The message says so.

_personal_gate_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -n "$_personal_gate_root" ] && [ -f "$_personal_gate_root/skills/ot-skill-sync/scripts/common.sh" ]; then
  # shellcheck source=../../skills/ot-skill-sync/scripts/common.sh
  . "$_personal_gate_root/skills/ot-skill-sync/scripts/common.sh"

  _personal_gate_dir="$(resolve_personal_skills_root)"
  if [ -d "$_personal_gate_dir" ]; then
    echo "  - Personal skills staging guard"
    _personal_gate_canonical="$(canonical_path "$_personal_gate_dir")"
    _personal_gate_violations=""

    # Only paths under the generated skill dirs can resolve into the personal
    # root, so the scan is bounded to those prefixes.
    for _personal_gate_staged in $(git diff --cached --name-only --diff-filter=ACMR -- "$UNIVERSAL_DIR" $AGENT_SKILL_DIRS 2>/dev/null); do
      # Walk the staged path's ancestors: the staged entry may be the symlink
      # itself, or a file reached THROUGH it (git follows a symlinked directory
      # when you force-add a path beneath it).
      _personal_gate_probe="$_personal_gate_staged"
      while [ -n "$_personal_gate_probe" ] && [ "$_personal_gate_probe" != "." ] && [ "$_personal_gate_probe" != "/" ]; do
        if [ -L "$_personal_gate_root/$_personal_gate_probe" ] &&
          path_is_under "$(canonical_path "$_personal_gate_root/$_personal_gate_probe")" "$_personal_gate_canonical"; then
          _personal_gate_violations="$_personal_gate_violations
  $_personal_gate_staged (personal skill link: $_personal_gate_probe)"
          break
        fi
        _personal_gate_probe="$(dirname "$_personal_gate_probe")"
      done
    done

    if [ -n "$_personal_gate_violations" ]; then
      echo ""
      echo " 🚫 Personal skills cannot be committed. These staged paths resolve into $_personal_gate_dir:$_personal_gate_violations"
      echo ""
      echo "    Unstage them with: git restore --staged <path>"
      echo "    To ship one for real, promote it into the committed catalog:"
      echo "      bash skills/ot-skill-sync/scripts/personal.sh promote <name>"
      echo ""
      exit 1
    fi
  fi
fi

unset _personal_gate_canonical _personal_gate_dir _personal_gate_probe _personal_gate_root _personal_gate_staged _personal_gate_violations
