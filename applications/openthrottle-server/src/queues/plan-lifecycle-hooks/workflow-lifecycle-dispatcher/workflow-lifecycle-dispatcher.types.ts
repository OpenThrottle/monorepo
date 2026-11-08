import { type JobRunHooksConfig } from '@tools/workflows';

import type { RunPlanJobData } from '../../plans/plans.types.ts';

export interface CreateWorkflowLifecycleDispatcherParams {
  readonly hooks: JobRunHooksConfig | undefined;
  readonly parentJobId: string;
  readonly parentQueueName: string;
  readonly planRunJobData: RunPlanJobData;
  readonly signal?: AbortSignal;
}
