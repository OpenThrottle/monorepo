import { describe, expect, test } from 'vitest';
import {
  AGENTS_CHAT_LOW_CONFIDENCE_THRESHOLD,
  buildAgentsChatAssistantFooter,
} from './agents-chat-footer';
import type { ChatTurnResult } from './types';

const baseTurn = (): ChatTurnResult => ({
  assistantText: 'ok',
  conversationId: null,
  errorMessage: null,
  mcpTool: null,
  readOnlyAgentsChat: true,
  routingConfidence: null,
  routingReason: null,
  structuredPayloadJson: null,
  toolMetadataJson: null,
});

describe('buildAgentsChatAssistantFooter', () => {
  test('returns null when there is no routing metadata', () => {
    expect(buildAgentsChatAssistantFooter(baseTurn())).toBeNull();
  });

  test('joins tool, confidence, and reason', () => {
    const turn: ChatTurnResult = {
      ...baseTurn(),
      mcpTool: 'health',
      routingConfidence: 0.95,
      routingReason: 'exact_health_ping',
    };

    expect(buildAgentsChatAssistantFooter(turn)).toBe(
      'Tool: health · confidence 0.95 · exact_health_ping',
    );
  });

  test('prefixes low-confidence routes using the shared threshold', () => {
    const turn: ChatTurnResult = {
      ...baseTurn(),
      mcpTool: 'semantic_search',
      routingConfidence: AGENTS_CHAT_LOW_CONFIDENCE_THRESHOLD - 0.01,
      routingReason: 'default_semantic_search',
    };

    expect(buildAgentsChatAssistantFooter(turn)).toContain(
      'Low-confidence route',
    );
  });
});
