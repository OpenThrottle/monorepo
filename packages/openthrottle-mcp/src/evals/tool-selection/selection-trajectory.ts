/**
 * @description Converts between a {@link Selection} and the ATIF trajectory the eval core stores: one agent step
 * whose `tool_calls` are the model's first-turn calls. Token usage rides in the step and final metrics
 * (`prompt_tokens` INCLUDES the cache reads, per ATIF) with the two Anthropic-specific counters in `extra`, so
 * the run's usage can be summed back out exactly.
 */

import type {
  AtifToolCall,
  AtifTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';
import { ATIF_SCHEMA_VERSION } from '@openthrottle/openthrottle-agentic-utils';

import { TOOL_SELECTION_AGENT_NAME } from './data/data.dataset.ts';
import type { SelectedCall, Selection, SelectionUsage } from './eval-case.ts';

type CallsSelection = Extract<Selection, { readonly kind: 'calls' }>;

const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toolCallOf = (call: SelectedCall, index: number): AtifToolCall => {
  return {
    arguments: isRecord(call.input) ? call.input : {},
    function_name: call.name,
    tool_call_id: `call-${index + 1}`,
  };
};

/**
 * @description A one-step ATIF trajectory for a successful selection. No `cost_usd`: the suite has no price
 * table, and the core records an absent cost as unknown rather than free.
 * @public
 */
export const selectionToTrajectory = (
  selection: CallsSelection,
  model: string,
): AtifTrajectory => {
  const { usage } = selection;
  const promptTokens =
    usage.inputTokens +
    usage.cacheReadInputTokens +
    usage.cacheWriteInputTokens;
  const extra = {
    cache_write_input_tokens: usage.cacheWriteInputTokens,
    input_tokens: usage.inputTokens,
  };

  return {
    agent: { model_name: model, name: TOOL_SELECTION_AGENT_NAME, version: '1' },
    final_metrics: {
      extra,
      total_cached_tokens: usage.cacheReadInputTokens,
      total_completion_tokens: usage.outputTokens,
      total_prompt_tokens: promptTokens,
      total_steps: 1,
    },
    schema_version: ATIF_SCHEMA_VERSION,
    steps: [
      {
        message: selection.text,
        metrics: {
          cached_tokens: usage.cacheReadInputTokens,
          completion_tokens: usage.outputTokens,
          extra,
          prompt_tokens: promptTokens,
        },
        model_name: model,
        source: 'agent',
        step_id: 1,
        ...(selection.calls.length === 0
          ? {}
          : { tool_calls: selection.calls.map(toolCallOf) }),
      },
    ],
  };
};

/**
 * @description The first-turn selection a trajectory records: the tool calls of its first agent step. Usage is
 * zero; read it with {@link usageOfTrajectory}.
 * @public
 */
export const selectionFromTrajectory = (
  trajectory: AtifTrajectory,
): CallsSelection => {
  const step = trajectory.steps.find((candidate) => {
    return candidate.source === 'agent';
  });

  return {
    calls: (step?.tool_calls ?? []).map((call) => {
      return { input: call.arguments, name: call.function_name };
    }),
    kind: 'calls',
    text: step?.message ?? '',
    usage: {
      cacheReadInputTokens: 0,
      cacheWriteInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    },
  };
};

const counter = (
  source: Readonly<Record<string, unknown>> | undefined,
  key: string,
): number => {
  const value = source?.[key];

  return typeof value === 'number' ? value : 0;
};

/**
 * @description The token usage {@link selectionToTrajectory} recorded, or zeros for a trajectory without it.
 * @public
 */
export const usageOfTrajectory = (
  trajectory: AtifTrajectory,
): SelectionUsage => {
  const metrics = trajectory.final_metrics;

  return {
    cacheReadInputTokens: metrics?.total_cached_tokens ?? 0,
    cacheWriteInputTokens: counter(metrics?.extra, 'cache_write_input_tokens'),
    inputTokens: counter(metrics?.extra, 'input_tokens'),
    outputTokens: metrics?.total_completion_tokens ?? 0,
  };
};
