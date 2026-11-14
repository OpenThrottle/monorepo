/**
 * @description Turns one run's structured chunks into an ATIF v1.8 trajectory. Chunk streams carry
 * no per-inference boundaries, so steps are cut at the one boundary every CLI exposes: an agent
 * step collects text, reasoning and tool calls until its tools have answered, and the next text or
 * call after that opens a new step. A result with no call before it (an id-less tool, or a codex
 * run logged before its mapper emitted calls) has the call synthesized from the result, so every
 * observation in the document has a matching `tool_call_id`.
 */

import type {
  AtifFinalMetrics,
  AtifObservationResult,
  AtifStep,
  AtifToolCall,
  AtifTrajectory,
} from '../../types/atif.ts';
import type { ConversationStreamChunk } from '../conversation-backend/types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../conversation-backend/types.ts';
import type { NormalizedUsage } from './normalizeUsage.ts';
import { normalizeUsage } from './normalizeUsage.ts';
import {
  isToolResultError,
  toolArgumentsOf,
  toolCallIdOf,
  toolNameOf,
  toolResultContentOf,
} from './tool-metadata.ts';

/**
 * @description The ATIF version every OpenThrottle trajectory declares. Bump deliberately, with a
 * migration note (docs/openthrottle/eval-system-adr.md § Decision 3).
 * @public
 */
export const ATIF_SCHEMA_VERSION = 'ATIF-v1.8';

/**
 * @description Run facts the chunks do not carry. `openthrottle` lands verbatim under
 * `extra.openthrottle`; `reportsToolCalls: false` marks the trajectory incomplete.
 * @public
 */
export interface ChunksToAtifInput {
  readonly agentName: string;
  readonly agentVersion: string;
  readonly chunks: readonly ConversationStreamChunk[];
  readonly driverId: string;
  readonly modelName: string | undefined;
  readonly openthrottle: Readonly<Record<string, unknown>>;
  readonly prompt: string | undefined;
  readonly reportsToolCalls: boolean;
}

interface DraftStep {
  calls: AtifToolCall[];
  message: string;
  reasoning: string;
  results: AtifObservationResult[];
}

const emptyDraft = (): DraftStep => {
  return { calls: [], message: '', reasoning: '', results: [] };
};

const isEmptyDraft = (draft: DraftStep): boolean => {
  return (
    draft.calls.length === 0 &&
    draft.message === '' &&
    draft.reasoning === '' &&
    draft.results.length === 0
  );
};

const toAgentStep = (draft: DraftStep, stepId: number): AtifStep => {
  const reasoning = draft.reasoning.trim();

  return {
    message: draft.message.trim(),
    ...(draft.results.length > 0
      ? { observation: { results: draft.results } }
      : {}),
    ...(reasoning === '' ? {} : { reasoning_content: reasoning }),
    source: 'agent',
    step_id: stepId,
    ...(draft.calls.length > 0 ? { tool_calls: draft.calls } : {}),
  };
};

const sumUsage = (
  usages: readonly NormalizedUsage[],
): AtifFinalMetrics | undefined => {
  if (usages.length === 0) {
    return undefined;
  }

  const costs = usages
    .map((usage) => {
      return usage.costUsd;
    })
    .filter((cost): cost is number => {
      return cost !== undefined;
    });

  const totalCost = costs.reduce((sum, cost) => {
    return sum + cost;
  }, 0);
  // A run with no priced usage has no cost, which is not the same as a cost of zero.
  const costField = costs.length > 0 ? { total_cost_usd: totalCost } : {};

  const total = (pick: (usage: NormalizedUsage) => number): number => {
    return usages.reduce((sum, usage) => {
      return sum + pick(usage);
    }, 0);
  };

  return {
    extra: {
      raw_usage: usages.map((usage) => {
        return usage.raw;
      }),
    },
    total_cached_tokens: total((usage) => {
      return usage.cachedTokens;
    }),
    total_completion_tokens: total((usage) => {
      return usage.completionTokens;
    }),
    ...costField,
    total_prompt_tokens: total((usage) => {
      return usage.promptTokens;
    }),
  };
};

/**
 * @description Builds the ATIF document for one run.
 * @public
 */
export const chunksToAtif = (input: ChunksToAtifInput): AtifTrajectory => {
  const drafts: DraftStep[] = [];
  const errors: string[] = [];
  const usages: NormalizedUsage[] = [];
  let current = emptyDraft();
  let sessionId: string | undefined;
  let synthesized = 0;

  /** A step whose tools have answered is finished; the agent's next move opens a new one. */
  const draftForAction = (): DraftStep => {
    if (current.results.length > 0) {
      drafts.push(current);
      current = emptyDraft();
    }

    return current;
  };

  for (const chunk of input.chunks) {
    if (typeof chunk.error === 'string' && chunk.error.trim() !== '') {
      errors.push(chunk.error.trim());
    }

    switch (chunk.kind) {
      case CONVERSATION_STREAM_CHUNK_KINDS.session: {
        const id = chunk.metadata?.sessionId;
        sessionId = typeof id === 'string' && id !== '' ? id : sessionId;
        break;
      }
      case CONVERSATION_STREAM_CHUNK_KINDS.text:
        draftForAction().message += chunk.delta;
        break;
      case CONVERSATION_STREAM_CHUNK_KINDS.thinking:
        draftForAction().reasoning += chunk.delta;
        break;
      case CONVERSATION_STREAM_CHUNK_KINDS.toolCall: {
        const id = toolCallIdOf(chunk);
        const known = current.calls.some((call) => {
          return call.tool_call_id === id;
        });

        // claude announces a call at `content_block_start` and repeats it with full arguments.
        if (!known) {
          synthesized += id === undefined ? 1 : 0;
          draftForAction().calls.push({
            arguments: toolArgumentsOf(chunk),
            function_name: toolNameOf(chunk),
            tool_call_id: id ?? `call-${synthesized}`,
          });
        }
        break;
      }
      case CONVERSATION_STREAM_CHUNK_KINDS.toolResult: {
        let id = toolCallIdOf(chunk);
        const hasCall = current.calls.some((call) => {
          return call.tool_call_id === id;
        });

        if (id === undefined || !hasCall) {
          synthesized += id === undefined ? 1 : 0;
          id = id ?? `call-${synthesized}`;
          // Reported only on completion: the result is all there is, so it stands in for the call.
          current.calls.push({
            arguments: toolArgumentsOf(chunk),
            extra: { synthesized_from_result: true },
            function_name: toolNameOf(chunk),
            tool_call_id: id,
          });
        }

        current.results.push({
          content: toolResultContentOf(chunk),
          ...(isToolResultError(chunk) ? { extra: { is_error: true } } : {}),
          source_call_id: id,
        });
        break;
      }
      case CONVERSATION_STREAM_CHUNK_KINDS.usage: {
        const usage = normalizeUsage(input.driverId, chunk);

        if (usage !== undefined) {
          usages.push(usage);
        }
        break;
      }
      default:
        break;
    }
  }

  if (!isEmptyDraft(current)) {
    drafts.push(current);
  }

  const userSteps: AtifStep[] = [];

  if (input.prompt !== undefined) {
    userSteps.push({ message: input.prompt, source: 'user', step_id: 1 });
  }

  const steps = [
    ...userSteps,
    ...drafts.map((draft, index) => {
      return toAgentStep(draft, userSteps.length + index + 1);
    }),
  ];
  const finalMetrics = sumUsage(usages);

  return {
    agent: {
      name: input.agentName,
      version: input.agentVersion,
      ...(input.modelName === undefined ? {} : { model_name: input.modelName }),
    },
    extra: {
      openthrottle: {
        ...input.openthrottle,
        driver: input.driverId,
        errors,
        incomplete: !input.reportsToolCalls,
      },
    },
    final_metrics: { ...finalMetrics, total_steps: steps.length },
    schema_version: ATIF_SCHEMA_VERSION,
    ...(sessionId === undefined ? {} : { session_id: sessionId }),
    steps,
  };
};
