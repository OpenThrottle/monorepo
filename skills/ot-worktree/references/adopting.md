# Adopting ot-worktree in another repo

1. Sync the skills (`./skills/ot-skill-sync/scripts/sync.sh`, or the `ot-skill-sync` skill).
2. Optionally add `.worktree/provision.sh` (and `.worktree/teardown.sh`) — anything the repo needs to
   make a fresh checkout usable. Skip it entirely if `git worktree add` is already enough.
3. Optionally add the human entrypoints to `package.json`. Copy these verbatim — they resolve the
   skill wherever it lives, so there is nothing to adjust per repo:
   ```json
   "worktree:new": "sh -c 'd=skills/ot-worktree/scripts; [ -x \"$d/create.sh\" ] || d=.agents/skills/ot-worktree/scripts; exec \"$d/create.sh\" \"$@\"' --",
   "worktree:heal": "sh -c 'd=skills/ot-worktree/scripts; [ -x \"$d/heal.sh\" ] || d=.agents/skills/ot-worktree/scripts; exec \"$d/heal.sh\" \"$@\"' --",
   "worktree:remove": "sh -c 'd=skills/ot-worktree/scripts; [ -x \"$d/destroy.sh\" ] || d=.agents/skills/ot-worktree/scripts; exec \"$d/destroy.sh\" \"$@\"' --"
   ```
   **Why a ladder and not a path.** The skill lives at `skills/` in the repo that _authors_ it
   and at `.agents/skills/` in a repo that _installed_ it with `npx skills`. Neither path is right
   everywhere, so the ladder prefers the authoring path, falls back to the installed one, and `exec`s,
   so no extra process sits between the caller and the script's stdout (the `WorktreeCreate` hook
   reads `create.sh`'s stdout as the worktree path).
4. Optionally wire the Claude `WorktreeCreate` hook in `.claude/settings.json` and Cursor's
   `.cursor/worktrees.json` provision-in-place command at the same scripts, using the same ladder.
