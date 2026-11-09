import type { WORKTREE_SKILL_OVERLAY_STATUS } from './worktree-skill-overlay.constants.ts';

export interface EnsureWorktreeSkillOverlayParams {
  /** The run's acting user, whose checkout flag decides the opt-out. Null when unresolvable. */
  readonly actorUserId: string | null;
  /** The checkout the plan-run worktree is about to be created from. */
  readonly baseCheckoutPath: string;
}

interface WorktreeSkillOverlayOutcomeBase {
  readonly baseCheckoutPath: string;
}

/** Not a foreign git checkout (the OpenThrottle monorepo, no `.git`, or no OT root) — nothing to overlay. */
export interface WorktreeSkillOverlayNotForeign extends WorktreeSkillOverlayOutcomeBase {
  readonly status: typeof WORKTREE_SKILL_OVERLAY_STATUS.NOT_FOREIGN;
}

/** The user opted this checkout out; nothing was written. */
export interface WorktreeSkillOverlayOptedOut extends WorktreeSkillOverlayOutcomeBase {
  readonly status: typeof WORKTREE_SKILL_OVERLAY_STATUS.OPTED_OUT;
}

/** The overlay is in place (or the repo ships its own `ot-worktree`, which wins). */
export interface WorktreeSkillOverlayApplied extends WorktreeSkillOverlayOutcomeBase {
  readonly injectedNames: readonly string[];
  readonly status: typeof WORKTREE_SKILL_OVERLAY_STATUS.APPLIED;
}

/** Materializing threw; provisioning falls through to the server's SSOT scripts. */
export interface WorktreeSkillOverlayFailed extends WorktreeSkillOverlayOutcomeBase {
  readonly reason: string;
  readonly status: typeof WORKTREE_SKILL_OVERLAY_STATUS.FAILED;
}

export type WorktreeSkillOverlayOutcome =
  | WorktreeSkillOverlayApplied
  | WorktreeSkillOverlayFailed
  | WorktreeSkillOverlayNotForeign
  | WorktreeSkillOverlayOptedOut;
