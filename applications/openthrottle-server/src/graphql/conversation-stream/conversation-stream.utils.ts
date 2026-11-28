/**
 * Pure helpers for the conversation stream: replay-buffer compaction, and the
 * user-facing copy for cursor-agent startup failures.
 *
 * This text is composed server-side rather than in the chat components because
 * that is where it is produced: a terminal error chunk reaches the UI as a
 * plain system-message body, with no typed field to branch on. Keeping it in a
 * dedicated module (rather than inline in the service) preserves the
 * copy-out-of-logic boundary, and keying it off the shared
 * `CURSOR_FAILURE_KINDS` means the copy and the retry policy can never disagree
 * about what a failure is.
 */

import type { CursorFailureKindsValue } from '@openthrottle/agentic-conversation-backend';
import {
  classifyCursorFailure,
  CURSOR_FAILURE_KINDS,
  resolveChatBackendCapabilities,
  stripAnsi,
} from '@openthrottle/agentic-conversation-backend';
import { GraphQLError } from 'graphql';

import type { ConversationAttachmentFailureValue } from './conversation-stream.constants.ts';
import {
  CONVERSATION_ATTACHMENT_FAILURE,
  MAX_TURN_ATTACHMENTS,
} from './conversation-stream.constants.ts';
import type { ConversationStreamChunkPayload } from './conversation-stream.types.ts';

/** True for a plain text/thinking delta that can fold into its predecessor. */
const isFoldableDelta = (chunk: ConversationStreamChunkPayload): boolean => {
  return (
    !chunk.done &&
    chunk.error === null &&
    chunk.metadataJson === null &&
    (chunk.kind === 'text' || chunk.kind === 'thinking')
  );
};

/**
 * @description Shrink a replay buffer without losing its head: every run of
 * consecutive text (or thinking) deltas for one message, outside the newest
 * `keepTail` chunks, folds into its first chunk (same id and sortOrder, deltas
 * joined). The client already merges consecutive deltas of one kind into one
 * timeline event, so a replay of the compacted buffer renders the same reply.
 * The tail stays untouched because a subscriber can receive its newest chunks
 * twice (replayed and live), and only identical `messageId:sortOrder` keys
 * dedupe.
 */
export function compactReplayChunks(
  chunks: readonly ConversationStreamChunkPayload[],
  keepTail: number,
): ConversationStreamChunkPayload[] {
  const headLength = Math.max(chunks.length - keepTail, 0);
  const compacted: ConversationStreamChunkPayload[] = [];

  for (const chunk of chunks.slice(0, headLength)) {
    const previous = compacted[compacted.length - 1];
    const folds =
      previous !== undefined &&
      isFoldableDelta(previous) &&
      isFoldableDelta(chunk) &&
      previous.kind === chunk.kind &&
      previous.messageId === chunk.messageId;

    if (folds) {
      compacted[compacted.length - 1] = {
        ...previous,
        delta: previous.delta + chunk.delta,
      };
    } else {
      compacted.push(chunk);
    }
  }

  return [...compacted, ...chunks.slice(headLength)];
}

/**
 * One sentence naming what happened, then one naming what to do about it.
 * Every entry has a concrete next step — "try again" is only acceptable where
 * trying again is genuinely the right move.
 */
const CURSOR_STARTUP_ERROR_COPY: Readonly<
  Record<CursorFailureKindsValue, string>
> = {
  [CURSOR_FAILURE_KINDS.authRequired]: `Your cursor-agent login has expired or is unavailable. Run \`cursor-agent login\` in a terminal, then send this message again.`,
  [CURSOR_FAILURE_KINDS.notInstalled]: `cursor-agent is not installed, or is not on this server’s PATH. Install it with \`curl https://cursor.com/install -fsS | bash\`, or set OPENTHROTTLE_CURSOR_AGENT_BIN to its full path.`,
  [CURSOR_FAILURE_KINDS.timeout]: `cursor-agent did not start in time. This is usually a cold start — send the message again and it will normally succeed.`,
  [CURSOR_FAILURE_KINDS.unknown]: `cursor-agent could not start this chat. Send the message again; if it keeps failing, check the server logs for the full cursor-agent output.`,
};

/**
 * How much of the raw failure to keep alongside the copy. Enough to recognize
 * the failure at a glance; the untruncated text is already in the server log.
 */
const MAX_RAW_DETAIL_CHARS = 300;

/**
 * Compose the terminal-chunk text for a cursor startup failure: actionable copy
 * for the classified kind, plus the raw message so a misclassification never
 * costs the user their only diagnostic.
 *
 * The raw text is ANSI-stripped — cursor decorates its warnings, and those
 * escapes were previously forwarded into the composer verbatim.
 */
export function composeCursorStartupErrorText(rawMessage: string): string {
  const cleaned = stripAnsi(rawMessage).trim();
  const copy = CURSOR_STARTUP_ERROR_COPY[classifyCursorFailure(cleaned)];

  if (cleaned === '') {
    return copy;
  }

  let detail = cleaned;
  if (cleaned.length > MAX_RAW_DETAIL_CHARS) {
    detail = `${cleaned.slice(0, MAX_RAW_DETAIL_CHARS)}…`;
  }

  return `${copy}\n\nDetails: ${detail}`;
}

/**
 * @description A bad `attachmentIds` list as an ordinary GraphQL error (HTTP 200, `errors[]`) with
 * `extensions.code = 'BAD_USER_INPUT'` and the failure as `extensions.reason`.
 */
export const toAttachmentGraphqlError = (
  reason: ConversationAttachmentFailureValue,
  message: string,
): GraphQLError => {
  return new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT', reason },
  });
};

/**
 * @description The turn's attachment ids with duplicates dropped (first occurrence wins). An empty
 * or absent list is `[]` and never fails. Throws the `BAD_USER_INPUT` error when the backend/model
 * takes no images (`acceptsImages`, resolved by the caller: {@link backendAcceptsImages} for CLI
 * backends, the discovered per-model vision flag for `openai`) or more than {@link MAX_TURN_ATTACHMENTS} distinct ids were sent. Runs before anything
 * is read or written, so a refusal leaves no trace.
 */
export const selectAttachmentIds = (
  backend: string,
  attachmentIds: readonly string[] | null | undefined,
  acceptsImages: boolean,
): string[] => {
  const ids = [...new Set(attachmentIds ?? [])];
  if (ids.length === 0) {
    return [];
  }

  if (!acceptsImages) {
    throw toAttachmentGraphqlError(
      CONVERSATION_ATTACHMENT_FAILURE.ATTACHMENTS_UNSUPPORTED,
      `The ${backend} backend does not accept image attachments.`,
    );
  }

  if (ids.length > MAX_TURN_ATTACHMENTS) {
    throw toAttachmentGraphqlError(
      CONVERSATION_ATTACHMENT_FAILURE.TOO_MANY_ATTACHMENTS,
      `A message can carry at most ${MAX_TURN_ATTACHMENTS} images.`,
    );
  }

  return ids;
};

/**
 * @description Whether a CLI backend accepts image input, from its static capability descriptor.
 * The `openai` backend is decided per model from endpoint discovery instead, never from here.
 */
export const backendAcceptsImages = (backend: string): boolean => {
  return resolveChatBackendCapabilities(backend).imageInput;
};
