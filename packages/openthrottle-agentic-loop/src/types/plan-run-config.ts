import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-utils';

/**
 * @description Debug shim level of the defaults block, aligned with `WorkflowConfigDebug`.
 * @public
 */
export type PlanRunDefaultsDebug = 'debug' | 'omit' | 'verbose';

/**
 * @description Shape of the `defaults` block in the repo's `.openthrottle/ot-loop.json`: only what
 * OT Loop reads. Env vars (`PLAN_RUN_ENV`) override it; enqueue tuning overrides both.
 * @public
 */
export interface PlanRunDefaultsFileV1Json {
  readonly debug?: PlanRunDefaultsDebug;
  readonly driver?: WorkflowConfigRunner;
  /** @description Per-attempt agent timeout in **seconds**. */
  readonly iterationTimeout?: number;
  readonly lifecycleHooksChildJobs?: boolean;
  readonly model?: string;
  /** @description Explicit OpenThrottle monorepo root (see `PLAN_RUN_OT_ROOT_ENV`). */
  readonly otRoot?: string;
  /** @description Base branch a finished run's PR targets. */
  readonly worktreeBase?: string;
}

/**
 * @description Result of merging built-ins + file + env (before enqueue overrides).
 * Implementation: `loadPlanRunConfig`.
 * @public
 */
export interface PlanRunResolvedDefaults extends Required<
  Pick<PlanRunDefaultsFileV1Json, 'debug' | 'driver' | 'model'>
> {
  readonly iterationTimeout: number | undefined;
  readonly lifecycleHooksChildJobs: boolean;
  readonly otRoot: string | undefined;
  readonly worktreeBase: string | undefined;
}
