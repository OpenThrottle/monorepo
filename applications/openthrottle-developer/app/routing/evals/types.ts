/**
 * @description View types for the trajectory viewer. The ATIF types come from
 * `@openthrottle/openthrottle-agentic-utils` as TYPES ONLY: that package is
 * node-only at runtime, so the document is parsed in the route loader
 * (`utils/parse-trajectory.server.ts`) and components receive plain data.
 */
import type {
  AtifObservationResult,
  AtifStep,
  AtifToolCall,
  AtifTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';

import type { AgentTrajectoryLabelRowFragment } from '~/__generated__/graphql';

export type {
  AtifObservationResult,
  AtifStep,
  AtifToolCall,
  AtifTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';

/** A rater's judgement, as `labelAgentTrajectory` accepts it. */
export type TrajectoryVerdict = 'fail' | 'pass';

/** One tool call with the observation results that answered it. */
export interface TrajectoryToolCallView {
  readonly call: AtifToolCall;
  /** True when any matched result is marked `extra.is_error`. */
  readonly isError: boolean;
  /** True when the driver reported only the result and the call was rebuilt from it. */
  readonly isSynthesized: boolean;
  /** Results whose `source_call_id` is this call's id, in document order. */
  readonly results: readonly AtifObservationResult[];
  /** Embedded subagents whose id appears in one of this call's results. */
  readonly subagents: readonly AtifTrajectory[];
}

/** One step, with its tool calls paired to their results. */
export interface TrajectoryStepView {
  readonly step: AtifStep;
  readonly toolCalls: readonly TrajectoryToolCallView[];
  /** Results with no `source_call_id`, or one naming a call this step does not hold. */
  readonly unmatchedResults: readonly AtifObservationResult[];
}

/** A whole trajectory, ready to render. */
export interface TrajectoryTimelineView {
  readonly steps: readonly TrajectoryStepView[];
  /** Subagents no tool call's result mentions; rendered in their own section. */
  readonly unplacedSubagents: readonly AtifTrajectory[];
}

/** A label action that failed; `error` is what the form shows. */
export interface TrajectoryLabelActionFailure {
  readonly error: string;
  readonly ok: false;
}

/** A saved label, as `labelAgentTrajectory` returned it. */
export interface TrajectoryLabelSaved {
  readonly label: AgentTrajectoryLabelRowFragment;
  readonly ok: true;
}

/** A removed label. */
export interface TrajectoryLabelRemoved {
  readonly ok: true;
}
