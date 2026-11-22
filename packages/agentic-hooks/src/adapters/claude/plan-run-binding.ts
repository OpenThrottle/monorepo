/**
 * Claude Code seam for the tool-neutral plan-run binding
 * (`../../data/findPlanRunBinding.ts`) and plan narration
 * (`../../data/plan-narration.ts`): how a Claude session transcript lists a
 * line's tool calls (main-thread `tool_use` blocks only), where the run id
 * sits in a `register_plan_run` result, and when a line was written.
 */
import { isRecord } from '@openthrottle/nodejs-utils';
import {
  claudeSessionToolUsesOf,
  findClaudeSessionPlanRunId,
} from '@openthrottle/openthrottle-agentic-utils';

import type {
  PlanNarrationTranscriptAdapter,
  PlanRunBinding,
} from '../../index.ts';
import { findPlanRunBinding } from '../../index.ts';

/** Reads a Claude Code session transcript for the plan-run binding and narration. */
export const claudePlanRunTranscript: PlanNarrationTranscriptAdapter = {
  planRunIdOf: (events) => {
    return findClaudeSessionPlanRunId(events) ?? null;
  },
  timestampMsOf: (event) => {
    if (!isRecord(event) || typeof event.timestamp !== 'string') return null;
    const ms = Date.parse(event.timestamp);
    return Number.isNaN(ms) ? null : ms;
  },
  toolUsesOf: claudeSessionToolUsesOf,
};

/** The plan-run binding of parsed Claude Code transcript lines. */
export const findClaudePlanRunBinding = (
  events: readonly unknown[],
): PlanRunBinding => {
  return findPlanRunBinding(events, claudePlanRunTranscript);
};
