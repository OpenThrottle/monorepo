/**
 * @description Validates untrusted JSON as an ATIF document — the server's check on what a client
 * sends to `recordAgentTrajectory`. Every check is a type predicate over the fields OpenThrottle
 * produces and reads; unknown extra fields are allowed through, as the spec allows.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  AtifFinalMetrics,
  AtifMetrics,
  AtifObservation,
  AtifStep,
  AtifToolCall,
  AtifTrajectory,
} from '../../types/atif.ts';

const isOptionalString = (value: unknown): boolean => {
  return value === undefined || typeof value === 'string';
};

const isOptionalNumber = (value: unknown): boolean => {
  return (
    value === undefined || (typeof value === 'number' && Number.isFinite(value))
  );
};

const isOptionalRecord = (value: unknown): boolean => {
  return value === undefined || isRecord(value);
};

const isSubagentRef = (value: unknown): boolean => {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    isOptionalString(value.trajectory_id) &&
    isOptionalString(value.trajectory_path)
  );
};

const isToolCall = (value: unknown): value is AtifToolCall => {
  return (
    isRecord(value) &&
    typeof value.tool_call_id === 'string' &&
    typeof value.function_name === 'string' &&
    isRecord(value.arguments) &&
    isOptionalRecord(value.extra)
  );
};

const isObservation = (value: unknown): value is AtifObservation => {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    return false;
  }

  return value.results.every((result: unknown) => {
    return (
      isRecord(result) &&
      typeof result.content === 'string' &&
      isOptionalString(result.source_call_id) &&
      isOptionalRecord(result.extra) &&
      isSubagentRef(result.subagent_trajectory_ref)
    );
  });
};

const isMetrics = (value: unknown): value is AtifMetrics => {
  return (
    isRecord(value) &&
    isOptionalNumber(value.prompt_tokens) &&
    isOptionalNumber(value.cached_tokens) &&
    isOptionalNumber(value.completion_tokens) &&
    isOptionalNumber(value.cost_usd) &&
    isOptionalRecord(value.extra)
  );
};

const isFinalMetrics = (value: unknown): value is AtifFinalMetrics => {
  return (
    isRecord(value) &&
    isOptionalNumber(value.total_prompt_tokens) &&
    isOptionalNumber(value.total_cached_tokens) &&
    isOptionalNumber(value.total_completion_tokens) &&
    isOptionalNumber(value.total_cost_usd) &&
    isOptionalNumber(value.total_steps) &&
    isOptionalRecord(value.extra)
  );
};

const isStep = (value: unknown): value is AtifStep => {
  if (!isRecord(value)) {
    return false;
  }

  const isSource =
    value.source === 'agent' ||
    value.source === 'system' ||
    value.source === 'user';
  const toolCalls = value.tool_calls;
  const hasValidCalls =
    toolCalls === undefined ||
    (Array.isArray(toolCalls) && toolCalls.every(isToolCall));

  return (
    isSource &&
    typeof value.step_id === 'number' &&
    typeof value.message === 'string' &&
    hasValidCalls &&
    (value.observation === undefined || isObservation(value.observation)) &&
    (value.metrics === undefined || isMetrics(value.metrics)) &&
    isOptionalString(value.reasoning_content) &&
    isOptionalString(value.model_name) &&
    isOptionalString(value.timestamp) &&
    isOptionalRecord(value.extra)
  );
};

/**
 * @description True when `value` is an ATIF document OpenThrottle can store and read.
 * @public
 */
export const isAtifTrajectory = (value: unknown): value is AtifTrajectory => {
  if (!isRecord(value) || !isRecord(value.agent)) {
    return false;
  }

  const { agent } = value;
  const hasValidSteps = Array.isArray(value.steps) && value.steps.every(isStep);

  return (
    typeof value.schema_version === 'string' &&
    typeof agent.name === 'string' &&
    typeof agent.version === 'string' &&
    isOptionalString(agent.model_name) &&
    hasValidSteps &&
    (value.final_metrics === undefined ||
      isFinalMetrics(value.final_metrics)) &&
    isOptionalString(value.session_id) &&
    isOptionalString(value.notes) &&
    isOptionalString(value.trajectory_id) &&
    isOptionalRecord(value.extra) &&
    hasValidSubagents(value.subagent_trajectories)
  );
};

/** Embedded subagents must each be a valid trajectory carrying its own `trajectory_id`. */
function hasValidSubagents(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    Array.isArray(value) &&
    value.every((subagent: unknown) => {
      return (
        isAtifTrajectory(subagent) && typeof subagent.trajectory_id === 'string'
      );
    })
  );
}

/**
 * @description Parses a JSON string as an ATIF document; `undefined` for invalid JSON or a
 * document that fails {@link isAtifTrajectory}.
 * @public
 */
export const parseAtifTrajectoryJson = (
  json: string,
): AtifTrajectory | undefined => {
  try {
    const parsed: unknown = JSON.parse(json);

    return isAtifTrajectory(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};
