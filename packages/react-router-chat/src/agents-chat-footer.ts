import type { ChatTurnResult } from './types';

/**
 * @description Aligns with server `AGENTS_MCP_ROUTER_LLM_CONFIDENCE_THRESHOLD` default for UI hints.
 */
export const AGENTS_CHAT_LOW_CONFIDENCE_THRESHOLD = 0.55;

/**
 * @description Builds a muted footer line for assistant bubbles (tool name, confidence, route reason, low-confidence hint).
 */
export const buildAgentsChatAssistantFooter = (
  turn: ChatTurnResult,
): string | null => {
  const segments: string[] = [];

  if (turn.mcpTool != null && turn.mcpTool !== '') {
    segments.push(`Tool: ${turn.mcpTool}`);
  }

  if (turn.routingConfidence != null) {
    segments.push(`confidence ${turn.routingConfidence.toFixed(2)}`);
  }

  if (turn.routingReason != null && turn.routingReason !== '') {
    segments.push(turn.routingReason);
  }

  const detail = segments.length > 0 ? segments.join(' · ') : '';
  const low =
    turn.routingConfidence != null &&
    turn.routingConfidence < AGENTS_CHAT_LOW_CONFIDENCE_THRESHOLD;

  if (low && detail.length > 0) {
    return `Low-confidence route — ${detail}`;
  }

  if (low) {
    return 'Low-confidence route.';
  }

  return detail.length > 0 ? detail : null;
};
