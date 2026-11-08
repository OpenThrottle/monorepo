/**
 * @description Types for the agentic-test BullMQ job (smoke test: echo timestamps for ~30s).
 */

import type { Job } from 'bullmq';

export interface AgenticTestJobPayload {
  readonly label?: string;
}

/** @description Return value of the agentic-test job for API/UI display. */
export interface AgenticTestJobResult {
  readonly echoedCount: number;
  readonly timestamps: readonly string[];
}

/** BullMQ job type for the agentic-test queue. */
export type AgenticTestJob = Job<AgenticTestJobPayload, AgenticTestJobResult>;
export interface RunAgenticTestEchoLoopOptions {
  readonly echoCount?: number;
  readonly intervalMs?: number;
  readonly now?: () => Date;
  readonly onEcho: (timestamp: string, index: number) => void;
  readonly sleep: (ms: number) => Promise<void>;
}
