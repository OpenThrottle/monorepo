/**
 * Canonical token-usage normalization now lives in the isomorphic
 * `@openthrottle/agentic-token-usage` leaf, so the SAME code runs on the server
 * persistence path (`ConversationStreamService`) and here in the browser chat
 * UI — no duplicate implementation to drift. This module re-exports it (the
 * normalizer, accumulator, guard, and the UI formatters) to preserve every
 * existing `@openthrottle/react-router-chat` import site. See OT plan
 * a55b76ba (tasks 1–2).
 */

export {
  formatTokenCount,
  formatUsageCost,
  hasUsageCounts,
  normalizeUsage,
  sumUsage,
} from '@openthrottle/agentic-token-usage';
export type { NormalizedTokenUsage } from '@openthrottle/agentic-token-usage';
