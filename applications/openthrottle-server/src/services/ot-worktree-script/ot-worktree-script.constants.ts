/**
 * The ot-worktree actions the server execs. Each maps to `skills/ot-worktree/scripts/<action>.sh`.
 */
export const OT_WORKTREE_ACTION = {
  CREATE: 'create',
  DESTROY: 'destroy',
  HEAL: 'heal',
} as const;

/** Which rung of the resolution ladder produced the script, in ladder order. */
export const OT_WORKTREE_SCRIPT_RUNG = {
  AGENTS_OVERLAY: 'agents-overlay',
  CHECKOUT_SKILLS: 'checkout-skills',
  CLAUDE_OVERLAY: 'claude-overlay',
  OPENTHROTTLE_SSOT: 'openthrottle-ssot',
} as const;

/** The skill's script directory, relative to a skills root. */
export const OT_WORKTREE_SCRIPTS_RELATIVE_PATH = 'ot-worktree/scripts';
