/**
 * @description Job payloads + results for the tagging queue.
 */

import type { Job } from 'bullmq';

export const TAGGING_ENTITY_TYPES = {
  PLAN: 'plan',
  TASK: 'task',
} as const;

export type TaggingEntityType =
  (typeof TAGGING_ENTITY_TYPES)[keyof typeof TAGGING_ENTITY_TYPES];

export interface PredictTaggingJobData {
  readonly entityId: string;
  readonly entityType: TaggingEntityType;
}

export interface RefineTaggingJobData {
  readonly planId: string;
  /** owner/name, as stored on the git_commit work-ledger artifact payload (repo). */
  readonly repo: string;
  readonly sha: string;
}

export interface TaggingJobResult {
  readonly added: number;
  readonly removed: number;
  readonly skipped: string | null;
}

export type PredictTaggingJob = Job<PredictTaggingJobData, TaggingJobResult>;
export type RefineTaggingJob = Job<RefineTaggingJobData, TaggingJobResult>;
