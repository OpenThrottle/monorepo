/**
 * @description The registry of retention policies the sweep applies, in order.
 *
 * Adding a table's retention rule means writing one policy under `policies/` and
 * appending it here — the processor, the dry-run reporting and the batching are
 * shared and need no change.
 */

import type { RetentionPolicy } from './data-retention.types';
import { agentTokenUsagePolicy } from './policies/agent-token-usage.policy';
import { codeEmbeddingsPolicy } from './policies/code-embeddings.policy';
import { planOutputStreamPolicy } from './policies/plan-output-stream.policy';
import {
  skillUsageEventsPolicy,
  skillUsageOutcomesPolicy,
} from './policies/skill-usage.policy';
import { workLedgerPolicy } from './policies/work-ledger.policy';

export const DATA_RETENTION_POLICIES: readonly RetentionPolicy[] = [
  planOutputStreamPolicy,
  workLedgerPolicy,
  agentTokenUsagePolicy,
  skillUsageEventsPolicy,
  skillUsageOutcomesPolicy,
  codeEmbeddingsPolicy,
];

/**
 * DI token for the policy list. Injected rather than imported directly so tests
 * can supply their own policies without mutating the registry.
 */
export const DATA_RETENTION_POLICIES_TOKEN = 'DATA_RETENTION_POLICIES';
