import { Injectable } from '@nestjs/common';

/**
 * @description In-memory registry of AbortControllers for in-flight scheduled-agent-job runs, keyed
 * by run id, so a `cancelScheduledAgentJobRun` mutation (and shutdown/timeout paths) can signal the
 * worker to terminate the agent CLI while the BullMQ job stays active until `process()` returns.
 * Mirrors `PlanRunCancellationService`; provided in the producer module so api and worker share one
 * instance under `PROCESS_ROLE=all`.
 */
@Injectable()
export class ScheduledAgentJobCancellationService {
  private readonly controllers = new Map<string, AbortController>();

  /**
   * @description Registers a fresh controller for `runId` and returns its signal, aborting any prior
   * registration so only one active controller applies per run.
   */
  attach(runId: string): AbortSignal {
    this.controllers.get(runId)?.abort();

    const controller = new AbortController();
    this.controllers.set(runId, controller);

    return controller.signal;
  }

  /** @description Clears the registration when the run completes (success or failure). */
  detach(runId: string): void {
    this.controllers.delete(runId);
  }

  /**
   * @description Aborts an active run. Returns true when a controller was registered for this run in
   * this process and abort was called.
   */
  abort(runId: string): boolean {
    const controller = this.controllers.get(runId);
    if (!controller) {
      return false;
    }

    controller.abort();

    return true;
  }
}
