/**
 * @description Job payloads + results for the tagging queue.
 */
import type { Job } from 'bullmq';

import type { ForgeKind } from '../../services/source-control/source-control.types.ts';
import type { TAGGING_ENTITY_TYPES } from './tagging.constants.ts';
export type TaggingEntityType =
  (typeof TAGGING_ENTITY_TYPES)[keyof typeof TAGGING_ENTITY_TYPES];

export interface PredictTaggingJobData {
  readonly entityId: string;
  readonly entityType: TaggingEntityType;
}

export interface RefineTaggingJobData {
  /**
   * The forge `repo` is on. Optional only because jobs enqueued before forges existed lack it;
   * those are GitHub jobs, and the processor reads absence that way.
   */
  readonly forge?: ForgeKind;
  readonly planId: string;
  /** The repo's forge fullName, as stored on the git_commit work-ledger artifact payload (repo). */
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
export interface TaggingClassificationInput {
  readonly description: string | null;
  /** Optional diff excerpt (refine-tagging). */
  readonly diff?: string;
  readonly summary: string | null;
  readonly title: string;
}

export interface TaggingVocabularyEntry {
  readonly dimension: string;
  readonly tag: string;
}

export interface TaggingPrediction {
  readonly confidence: number;
  readonly dimension: string;
  readonly tag: string;
}

export interface TaggingModelProvider {
  classify(
    input: TaggingClassificationInput,
    vocabulary: readonly TaggingVocabularyEntry[],
  ): Promise<TaggingPrediction[]>;
  /** Human-readable provider name for logs. */
  readonly name: string;
}
