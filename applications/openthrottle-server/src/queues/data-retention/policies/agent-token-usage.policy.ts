/**
 * @description Retention policy for `agent_token_usage` — the per-turn token and
 * cost fact table behind the Usage UI.
 *
 * One row per assistant turn, append-only, never purged. Small today (137 rows in
 * ~3 weeks on the audited database) but it scales with chat volume rather than
 * with any bounded entity, so it is the classic fact table that is fine until it
 * suddenly is not.
 *
 * 180 days is chosen to sit just past the longest window the Usage UI offers, so
 * every view the product can render is still answered from raw rows. If usage
 * reporting later needs a longer horizon, the answer is a monthly rollup table
 * feeding the UI — not a longer raw-row window, which just defers the problem.
 *
 * The delete is index-friendly: `idx_agent_token_usage_user_created_at` leads on
 * user_id, but `idx_agent_token_usage_user_provider_created_at` and the age scan
 * keep this bounded at the batch sizes the sweep uses.
 */

import { createAgeRetentionPolicy } from './create-age-retention-policy';

export const agentTokenUsagePolicy = createAgeRetentionPolicy({
  column: 'created_at',
  days: 180,
  name: 'agent-token-usage',
  rationale:
    'just past the longest window the Usage UI offers, so every rendered view is still served from raw rows',
  table: 'agent_token_usage',
});
