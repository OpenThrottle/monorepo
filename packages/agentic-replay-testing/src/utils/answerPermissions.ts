/**
 * Answering the permission requests a supervised ACP turn surfaces. The
 * backend emits a `permission_request` chunk and waits for a human; a recording
 * or replay has none, so its driver passes one of these as `onChunk`.
 */

import type { ConversationStreamChunk } from '@openthrottle/agentic-conversation-backend';
import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  resolveAcpPermission,
} from '@openthrottle/agentic-conversation-backend';
import { isRecord } from '@openthrottle/nodejs-utils';

/**
 * An `onChunk` handler that answers every pending permission request with
 * `optionId`, or cancels it when `optionId` is null (a refusal, as a headless
 * run does). The chunk that reports the resolution is ignored.
 *
 * @public
 */
export function answerPermissions(
  optionId: string | null,
): (chunk: ConversationStreamChunk) => void {
  return (chunk) => {
    const { metadata } = chunk;
    const isPending =
      chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.permissionRequest &&
      isRecord(metadata) &&
      !('resolution' in metadata);
    if (isPending && typeof metadata.requestId === 'string') {
      resolveAcpPermission(metadata.requestId, optionId);
    }
  };
}
