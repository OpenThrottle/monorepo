import type { TrajectoryRecord } from '@openthrottle/openthrottle-agentic-utils';

/**
 * @description How an attempt ended. `usage_limited` is a pause, not a failure: it is excluded
 * from pass rates and the run can resume from it.
 * @public
 */
export type EvalTrialStatus = 'completed' | 'errored' | 'usage_limited';

/**
 * @description One attempt at one case. `workspaceCwd` is the directory the agent ran in; it is
 * only valid while graders run, because the workspace is disposed afterwards.
 * @public
 */
export interface EvalTrial {
  readonly attempt: number;
  readonly caseId: string;
  readonly error: string | null;
  readonly finalText: string;
  readonly status: EvalTrialStatus;
  readonly trajectory: TrajectoryRecord | null;
  readonly workspaceCwd: string;
}
