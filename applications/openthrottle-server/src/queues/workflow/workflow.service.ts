import { Injectable } from '@nestjs/common';

/**
 * @description In-memory registry of AbortControllers for in-flight plan-run jobs so GraphQL
 * `cancelPlanRun` can signal the worker to terminate the Ralph child (SIGTERM/SIGKILL) while the
 * BullMQ job remains active until `process()` finishes.
 */
@Injectable()
export class WorkflowService {
  private readonly controllers = new Map<string, AbortController>();

  /**
   * @description Invoked from `cancelPlanRun` to stop an active Ralph run. Returns true when a
   * worker had registered a controller for this plan and abort was called.
   */
  abort(planId: string): boolean {
    const controller = this.controllers.get(planId);
    if (!controller) {
      return false;
    }

    controller.abort();

    return true;
  }

  /**
   * @description Registers a fresh controller for `planId` and returns its signal. If a prior
   * registration exists (e.g. overlapping jobs or a rapid re-run before detach), it is aborted
   * first so only one active controller applies per plan.
   */
  attach(planId: string): AbortSignal {
    const previous = this.controllers.get(planId);
    previous?.abort();

    const controller = new AbortController();
    this.controllers.set(planId, controller);

    return controller.signal;
  }

  /**
   * @description Clears the registration when the plan job completes (success or failure).
   */
  detach(planId: string): void {
    this.controllers.delete(planId);
  }
}
