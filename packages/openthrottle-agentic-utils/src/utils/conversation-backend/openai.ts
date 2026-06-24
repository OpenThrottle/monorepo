/**
 * The OpenAI-compatible backend: the existing {@link streamChatCompletion} path
 * expressed behind the {@link ConversationBackend} seam. It tags every chunk
 * `kind: 'text'` and otherwise preserves the original behavior exactly — deltas
 * followed by a single terminal `{ done: true }`, SDK errors thrown to the
 * consumer.
 */

import { streamChatCompletion } from '../chat-completions/index.js';
import { CONVERSATION_STREAM_CHUNK_KINDS } from './types.js';
import type {
  ConversationBackend,
  ConversationBackendRun,
  ConversationStreamChunk,
} from './types.js';

async function* streamOpenAi(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.baseUrl === undefined) {
    throw new Error('The openai conversation backend requires a baseUrl.');
  }

  for await (const chunk of streamChatCompletion({
    baseUrl: run.baseUrl,
    messages: run.messages,
    model: run.model,
    signal: run.signal,
  })) {
    yield {
      delta: chunk.delta,
      done: chunk.done,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
    };
  }
}

/**
 * Backend for OpenAI-compatible local endpoints (Ollama, LM Studio, vLLM, …).
 *
 * @publicApi
 */
export const openAiConversationBackend: ConversationBackend = {
  stream: streamOpenAi,
};
