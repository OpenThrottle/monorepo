import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  AtifObservationResult,
  AtifStep,
  AtifToolCall,
  AtifTrajectory,
  TrajectoryStepView,
  TrajectoryTimelineView,
  TrajectoryToolCallView,
} from '~/routing/evals/types';

/**
 * @description True when the driver marked an observation result as a tool
 * error (`extra.is_error`).
 */
export const isErrorResult = (result: AtifObservationResult): boolean => {
  return result.extra?.is_error === true;
};

/**
 * @description True when the call was rebuilt from its result
 * (`extra.synthesized_from_result`): codex and opencode report a tool only once
 * it finishes, so its arguments may be partial.
 */
export const isSynthesizedCall = (call: AtifToolCall): boolean => {
  return call.extra?.synthesized_from_result === true;
};

/**
 * @description The run-level errors OpenThrottle recorded under
 * `extra.openthrottle.errors`; empty when there are none or the field is absent.
 */
export const readTrajectoryErrors = (
  trajectory: AtifTrajectory,
): readonly string[] => {
  const openthrottle = trajectory.extra?.openthrottle;
  const errors = isRecord(openthrottle) ? openthrottle.errors : undefined;

  if (!Array.isArray(errors)) {
    return [];
  }

  return errors.filter((error: unknown): error is string => {
    return typeof error === 'string' && error.trim() !== '';
  });
};

/**
 * @description The `source_call_id` of the result that spawned `subagentId`:
 * the one whose ATIF `subagent_trajectory_ref` names it, else (for documents
 * written before the reference was stamped) the first whose content mentions
 * it. `undefined` when the subagent has no id or nothing points at it.
 */
const findSpawningCallId = (
  results: readonly AtifObservationResult[],
  subagentId: string | undefined,
): string | undefined => {
  if (subagentId === undefined || subagentId === '') {
    return undefined;
  }

  const referenced = results.find((result) => {
    return result.subagent_trajectory_ref?.trajectory_id === subagentId;
  });
  const mentioned = results.find((result) => {
    return (
      result.source_call_id !== undefined && result.content.includes(subagentId)
    );
  });

  return (referenced ?? mentioned)?.source_call_id;
};

/**
 * @description Maps each embedded subagent to the tool call whose result
 * mentions its `trajectory_id` (Claude's Agent tool result carries the spawned
 * agent's id). A subagent is placed at most once, under the first call that
 * mentions it; one that no result mentions is returned as unplaced, so it is
 * still shown — in a separate section — rather than silently dropped.
 */
export const correlateSubagents = (
  trajectory: AtifTrajectory,
): {
  readonly byCallId: ReadonlyMap<string, readonly AtifTrajectory[]>;
  readonly unplaced: readonly AtifTrajectory[];
} => {
  const byCallId = new Map<string, AtifTrajectory[]>();
  const unplaced: AtifTrajectory[] = [];
  const results = trajectory.steps.flatMap((step) => {
    return step.observation?.results ?? [];
  });

  for (const subagent of trajectory.subagent_trajectories ?? []) {
    const callId = findSpawningCallId(results, subagent.trajectory_id);

    if (callId === undefined) {
      unplaced.push(subagent);
      continue;
    }

    byCallId.set(callId, [...(byCallId.get(callId) ?? []), subagent]);
  }

  return { byCallId, unplaced };
};

/**
 * @description Pairs a step's tool calls with the observation results that
 * answer them (`source_call_id` → `tool_call_id`), keeping any result that
 * names no call of this step so it is never hidden.
 */
export const buildStepView = (
  step: AtifStep,
  subagentsByCallId: ReadonlyMap<string, readonly AtifTrajectory[]>,
): TrajectoryStepView => {
  const calls = step.tool_calls ?? [];
  const results = step.observation?.results ?? [];
  const callIds = new Set(
    calls.map((call) => {
      return call.tool_call_id;
    }),
  );

  const toolCalls = calls.map((call): TrajectoryToolCallView => {
    const matched = results.filter((result) => {
      return result.source_call_id === call.tool_call_id;
    });

    return {
      call,
      isError: matched.some(isErrorResult),
      isSynthesized: isSynthesizedCall(call),
      results: matched,
      subagents: subagentsByCallId.get(call.tool_call_id) ?? [],
    };
  });

  const unmatchedResults = results.filter((result) => {
    return (
      result.source_call_id === undefined || !callIds.has(result.source_call_id)
    );
  });

  return { step, toolCalls, unmatchedResults };
};

/**
 * @description Builds the render-ready view of a trajectory: every step in
 * document order with its calls paired to results, and embedded subagents
 * placed under the call that spawned them where that can be told.
 */
export const buildTrajectoryTimeline = (
  trajectory: AtifTrajectory,
): TrajectoryTimelineView => {
  const { byCallId, unplaced } = correlateSubagents(trajectory);
  const steps = trajectory.steps.map((step) => {
    return buildStepView(step, byCallId);
  });

  return { steps, unplacedSubagents: unplaced };
};
