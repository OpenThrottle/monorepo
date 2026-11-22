import type {
  PlanRun,
  ProjectRunStatus,
} from '@openthrottle/nestjs-repositories-server';

/**
 * @description What one {@link ProjectRunAdvanceService.advance} call did. Exactly one move per call:
 * enqueue the next plan, settle the run, or nothing (`waiting`, `busy`, `lost_race`).
 */
export type ProjectRunAdvanceOutcome =
  | { readonly kind: 'already_settled'; readonly status: ProjectRunStatus }
  /** Another advancer holds this run's lock; it makes the move. */
  | { readonly kind: 'busy' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'completed' }
  | {
      readonly jobId: string;
      readonly kind: 'enqueued';
      readonly planId: string;
    }
  /** A guarded transition matched no active row: something else settled the run first. */
  | { readonly kind: 'lost_race' }
  | { readonly kind: 'not_found' }
  | {
      readonly kind: 'stopped';
      readonly planId: string;
      readonly reason: string;
    }
  | {
      readonly kind: 'waiting';
      readonly planId: string;
      readonly planRunId: string;
    };

/**
 * @description The advance step's verdict on the plan run a project run started for one plan.
 */
export type PlanRunVerdict =
  | { readonly kind: 'done' }
  | { readonly kind: 'stop'; readonly reason: string }
  | { readonly kind: 'wait'; readonly planRunId: string };

/**
 * @description What the verdicts read, gathered once per advance: the continuation of each
 * usage-limited run (keyed by the limited run's id), the COMPLETED runs that recorded a pull
 * request, and the instant the settle grace is measured from.
 */
export interface PlanRunEvidence {
  readonly continuationByRunId: ReadonlyMap<string, PlanRun>;
  readonly now: Date;
  readonly runIdsWithPullRequest: ReadonlySet<string>;
}
