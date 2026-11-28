/**
 * The OpenAI-compatible backend: the existing {@link streamChatCompletion} path
 * expressed behind the {@link ConversationBackend} seam. It tags every chunk
 * `kind: 'text'` and otherwise preserves the original behavior exactly — deltas
 * followed by a single terminal `{ done: true }`, SDK errors thrown to the
 * consumer.
 */

import { readFile } from 'node:fs/promises';

import type {
  ConversationAttachment,
  ConversationBackend,
  ConversationBackendRun,
  ConversationStreamChunk,
} from '../types/conversation-backend.ts';
import type { ConversationReasoningEffort } from '../types/conversation-backend.ts';
import {
  CONVERSATION_REASONING_EFFORTS,
  CONVERSATION_STREAM_CHUNK_KINDS,
} from '../types/conversation-backend.ts';
import { withFileMentionsMessage } from './file-mentions.ts';
import type { ChatCompletionMessage } from './streamChatCompletion.ts';
import { streamChatCompletion } from './streamChatCompletion.ts';

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

/** The attachment bytes as a `data:` URL an `image_url` part can carry. */
async function toDataUrl(attachment: ConversationAttachment): Promise<string> {
  const bytes = await readFile(attachment.path);
  return `data:${attachment.mimeType};base64,${bytes.toString('base64')}`;
}

/**
 * Attach the turn's images to the LATEST user message as `data:` URLs (earlier
 * turns' images are not replayed). The server gates attachments on the selected
 * model's vision capability before this runs, so a non-vision model never
 * reaches here with images. Returns the list unchanged when there are none.
 */
async function withImageParts(
  messages: ReadonlyArray<ChatCompletionMessage>,
  attachments: readonly ConversationAttachment[] | undefined,
): Promise<ReadonlyArray<ChatCompletionMessage>> {
  if (attachments === undefined || attachments.length === 0) {
    return messages;
  }

  const lastUserIndex = messages
    .map((message) => message.role)
    .lastIndexOf('user');
  if (lastUserIndex === -1) {
    return messages;
  }

  const images = await Promise.all(attachments.map(toDataUrl));
  return messages.map((message, index) => {
    return index === lastUserIndex ? { ...message, images } : message;
  });
}

async function* streamOpenAi(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.baseUrl === undefined) {
    throw new Error('The openai conversation backend requires a baseUrl.');
  }

  for await (const chunk of streamChatCompletion({
    baseUrl: run.baseUrl,
    // openai has no file tools, so the @-mentioned paths ride as a leading
    // system message rather than a tool-actionable reference list.
    messages: await withImageParts(
      withFileMentionsMessage(run.messages, run.fileMentions),
      run.attachments,
    ),
    model: run.model,
    reasoningEffort: reasoningEffort(run.reasoning),
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
 * @public
 */
export const openAiConversationBackend: ConversationBackend = {
  stream: streamOpenAi,
};
