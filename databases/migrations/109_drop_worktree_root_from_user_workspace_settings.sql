-- Drop user_workspace_settings.worktree_root. The worktree root is now configured the way every
-- other path in this system is: the OT_WORKTREE_ROOT environment variable, documented in
-- .env.default, with a default OpenThrottle ships in code.
--
-- Why the column goes rather than staying as an override:
--
--   A database column cannot be read by a shell script. That is the whole problem it created. The
--   BullMQ provisioner could honour it (it forwarded the value as OT_WORKTREE_ROOT), but
--   `pnpm run worktree:new`, the Claude WorktreeCreate hook and Cursor could not — they silently
--   used the default. So a configured root applied to some worktrees and not others, and the
--   settings page confidently displayed a value half the system ignored.
--
--   Migration 108 tried to paper over this by documenting a second channel. One source of truth is
--   the actual fix.
--
-- The resolution ladder is now, highest first:
--
--   1. OT_WORKTREE_ROOT in the environment
--   2. OT_WORKTREE_ROOT in the target repository's .env  (a repo customizing its own worktrees)
--   3. ~/.openthrottle/worktrees/<repo-name>              (the default, mirrored in .env.default)
--
-- Data loss is intentional and bounded: the column held a single directory path per user, and any
-- user who had set one re-expresses it by uncommenting OT_WORKTREE_ROOT in their .env. Existing
-- worktrees are unaffected wherever they live — every action reads `git worktree list`, not this
-- setting. See docs/openthrottle/plan-run-worktrees.md.

ALTER TABLE user_workspace_settings
DROP COLUMN IF EXISTS worktree_root;
