/**
 * @description Types for the code-index BullMQ job: a full re-index of a registered repository's
 * source into the code_embeddings pgvector table, run via @openthrottle/nestjs-vector-search.
 */

import type { Job } from 'bullmq';

/** Job payload. `repositoryId` is a registered WorkspaceLocalRepository; `userId` scopes the lookup. */
export interface CodeIndexJobPayload {
  readonly repositoryId: string;
  readonly userId: string;
}

/** Result of a code-index job, for API/UI display. */
export interface CodeIndexJobResult {
  /** Number of files whose vectors were deleted (full mode clears the workspace first). */
  readonly deletedPaths: number;
  /** Number of chunks embedded and upserted. */
  readonly embedded: number;
  /** Echoed for the client. */
  readonly repositoryId: string;
}

/** BullMQ job type for the code-index queue. */
export type CodeIndexJob = Job<CodeIndexJobPayload, CodeIndexJobResult>;
