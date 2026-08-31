/**
 * The OpenAI-compatible backend: the existing {@link streamChatCompletion} path
 * expressed behind the {@link ConversationBackend} seam. It tags every chunk
 * `kind: 'text'` and otherwise preserves the original behavior exactly — deltas
 * followed by a single terminal `{ done: true }`, SDK errors thrown to the
 * consumer.
 */

import { streamChatCompletion } from '../chat-completions/index.ts';
import { withFileMentionsMessage } from './file-mentions.ts';
import {
  CONVERSATION_REASONING_EFFORTS,
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationReasoningEffort,
} from './types.ts';
import type {
  ConversationBackend,
  ConversationBackendRun,
  ConversationStreamChunk,
} from './types.ts';

/**
 * Map the composer reasoning level onto the OpenAI `reasoning_effort` triple
 * (`low`/`medium`/`high`), or `undefined` to omit it. OpenAI caps effort at
 * `high`, so `extraHigh`/`max`/`ultra` clamp to `high`.
 */
function reasoningEffort(
  reasoning: ConversationReasoningEffort | undefined,
): 'high' | 'low' | 'medium' | undefined {
  switch (reasoning) {
    case CONVERSATION_REASONING_EFFORTS.low:
      return 'low';
    case CONVERSATION_REASONING_EFFORTS.medium:
      return 'medium';
    case CONVERSATION_REASONING_EFFORTS.high:
    case CONVERSATION_REASONING_EFFORTS.extraHigh:
    case CONVERSATION_REASONING_EFFORTS.max:
    case CONVERSATION_REASONING_EFFORTS.ultra:
      return 'high';
    default:
      return undefined;
  }
}

async function* streamOpenAi(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.baseUrl === undefined) {
    throw new Error('The openai conversation backend requires a baseUrl.');
  }

  for await (const chunk of streamChatCompletion({
    apiKey: run.apiKey,
    baseUrl: run.baseUrl,
    headers: run.headers,
    // openai has no file tools, so the @-mentioned paths ride as a leading
    // system message rather than a tool-actionable reference list.
    messages: withFileMentionsMessage(run.messages, run.fileMentions),
    model: run.model,
    reasoningEffort: reasoningEffort(run.reasoning),
    signal: run.signal,
  })) {
    // Token accounting rides the TERMINAL chunk as metadata, the same shape
    // claude and cursor-agent use — the server re-emits any terminal metadata as
    // a discrete usage chunk, so this flows to both the live stream and the
    // persisted `agent_token_usage` row with no server-side special-casing.
    yield {
      delta: chunk.delta,
      done: chunk.done,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      ...(chunk.usage === undefined
        ? {}
        : { metadata: { usage: chunk.usage } }),
    };
  }
}

/**
 * Backend for OpenAI-compatible local endpoints (Ollama, LM Studio, vLLM, …).
 *
 * @public
 */
export const openAiConversationBackend: ConversationBackend = {
  stream: streamOpenAi,
};
