import { Injectable } from '@nestjs/common';

/**
 * @description In-memory registry of AbortControllers for in-flight plan-run jobs so GraphQL
 * `cancelPlanRun` can signal the worker to terminate the Ralph child (SIGTERM/SIGKILL) while the
 * BullMQ job remains active until `process()` finishes.
 */
@Injectable()
export class PlanRunCancellationService {
  private readonly controllers = new Map<string, AbortController>();

  /**
   * @description Registers a fresh controller for `planId` and returns its signal. If a prior
   * registration exists (should not happen for one plan at a time), it is aborted first.
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
}
