import type {
  OT_WORKTREE_ACTION,
  OT_WORKTREE_SCRIPT_RUNG,
} from './ot-worktree-script.constants.ts';

export type OtWorktreeAction =
  (typeof OT_WORKTREE_ACTION)[keyof typeof OT_WORKTREE_ACTION];

export type OtWorktreeScriptRung =
  (typeof OT_WORKTREE_SCRIPT_RUNG)[keyof typeof OT_WORKTREE_SCRIPT_RUNG];

export interface ResolveOtWorktreeScriptParams {
  readonly action: OtWorktreeAction;
  /** Absolute path of the checkout the action runs against (its cwd). */
  readonly baseCheckoutPath: string;
  /**
   * This process's environment, used to locate the OpenThrottle root for the SSOT rung. Injected so
   * the resolver stays testable.
   */
  readonly env: NodeJS.ProcessEnv;
}

export interface OtWorktreeScriptCandidate {
  readonly path: string;
  readonly rung: OtWorktreeScriptRung;
}

export interface ResolvedOtWorktreeScript {
  readonly ok: true;
  readonly rung: OtWorktreeScriptRung;
  /** Absolute path of the script; exec it as `bash <scriptPath> ...`. */
  readonly scriptPath: string;
}

export interface UnresolvedOtWorktreeScript {
  readonly ok: false;
  /** Every candidate path that was checked, in ladder order — for a legible error. */
  readonly searched: readonly string[];
}

export type OtWorktreeScriptResolution =
  ResolvedOtWorktreeScript | UnresolvedOtWorktreeScript;
