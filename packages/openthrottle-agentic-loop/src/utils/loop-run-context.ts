import type { LoopDeps } from '../contract/index.ts';

/** @description Mutable per-run bookkeeping; never exposed outside the package. */
export interface LoopRunTracker {
  /** 1-based worker invocation count of the current task; `undefined` outside a task. */
  attempt: number | undefined;
  readonly completedTaskIds: string[];
  currentTaskId: string | undefined;
  guidance: readonly string[];
  /** The previous task's session, ended at the next boundary. */
  sessionId: string | undefined;
  taskStartedAt: number;
}

export interface LoopRunContext {
  readonly deps: LoopDeps;
  readonly maxRetries: number;
  readonly planId: string;
  readonly tracker: LoopRunTracker;
}
