/** Which rung of the ladder produced the resolved root. */
export const WORKTREE_ROOT_SOURCE = {
  CHECKOUT_ENV: 'checkout-env',
  DEFAULT: 'default',
  ENV: 'env',
} as const;

/**
 * The default worktree root under `$HOME`, matching `resolve_worktree_root` in
 * `skills/ot-worktree/scripts/root.sh` and the commented entry in `.env.default` (a test keeps all
 * three from drifting). A hidden directory OpenThrottle owns, deliberately outside every repo so
 * worktrees stay clear of the Nx workspace. `homedir()` is read at call time, not module load, so it
 * stays mockable.
 */
export const DEFAULT_WORKTREE_ROOT_RELATIVE_PATH = '.openthrottle/worktrees';

/** The env var name the script reads, and the name the provisioner forwards the setting under. */
export const WORKTREE_ROOT_ENV_VAR = 'OPENTHROTTLE_WORKTREE_ROOT';
