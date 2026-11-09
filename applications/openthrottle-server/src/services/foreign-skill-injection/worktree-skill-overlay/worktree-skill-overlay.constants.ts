/** The one skill the worktree overlay materializes. */
export const WORKTREE_SKILL_OVERLAY_SKILL_NAME = 'ot-worktree';

/** What {@link WorktreeSkillOverlayService.ensureForBaseCheckout} did. */
export const WORKTREE_SKILL_OVERLAY_STATUS = {
  APPLIED: 'applied',
  FAILED: 'failed',
  NOT_FOREIGN: 'not-foreign',
  OPTED_OUT: 'opted-out',
} as const;
