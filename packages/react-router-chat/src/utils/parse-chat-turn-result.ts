import { isRecord } from '@openthrottle/nodejs-utils';

import type { ChatTurnResult } from '../types';
import { nullableString } from './nullable-string';

/** Parses a `send-agent-message` action payload, or null when it is not a turn result. */
export const parseChatTurnResult = (data: unknown): ChatTurnResult | null => {
  if (!isRecord(data)) {
    return null;
  }

  const d = data;

  // Only require the load-bearing fields. A minimal valid turn carrying just
  // `assistantText` + `errorMessage` must parse — the remaining fields are
  // additive metadata and default below, so a stricter presence check would
  // silently drop replies if the server contract grows or shrinks keys.
  if (!('assistantText' in d) || !('errorMessage' in d)) {
    return null;
  }

  return {
    assistantText: nullableString(d.assistantText),
    conversationId: nullableString(d.conversationId),
    errorMessage: nullableString(d.errorMessage),
    mcpTool: nullableString(d.mcpTool),
    readOnlyAgentsChat:
      typeof d.readOnlyAgentsChat === 'boolean' ? d.readOnlyAgentsChat : true,
    routingConfidence:
      typeof d.routingConfidence === 'number' ? d.routingConfidence : null,
    routingReason: nullableString(d.routingReason),
    structuredPayloadJson: nullableString(d.structuredPayloadJson),
    toolMetadataJson: nullableString(d.toolMetadataJson),
  };
};
