import type { Job } from 'bullmq';

/** @description Payload of an advance job: the project run to advance. */
export interface ProjectRunAdvanceJobData {
  readonly kind: 'advance';
  readonly projectRunId: string;
}

/** @description Payload of the repeatable reconcile job. */
export interface ProjectRunsReconcileJobData {
  readonly kind: 'reconcile';
}

/** @description Every job the project-runs queue carries. */
export type ProjectRunsJobData =
  ProjectRunAdvanceJobData | ProjectRunsReconcileJobData;

export type ProjectRunsJob = Job<ProjectRunsJobData, void>;
