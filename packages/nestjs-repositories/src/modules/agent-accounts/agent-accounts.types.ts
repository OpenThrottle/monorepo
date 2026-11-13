import type { AGENT_ACCOUNT_CREDENTIAL_KINDS } from './agent-accounts.constants.ts';

/** @public */
export type AgentAccountCredentialKind =
  (typeof AGENT_ACCOUNT_CREDENTIAL_KINDS)[keyof typeof AGENT_ACCOUNT_CREDENTIAL_KINDS];

/**
 * @public
 * @description One sighting of an agent account, as a usage writer saw it. Upserting it creates
 * the account or refreshes its descriptive fields and `last_seen_at`.
 */
export interface UpsertAgentAccountInput {
  readonly credentialKind: AgentAccountCredentialKind;
  readonly email: string | null;
  readonly externalAccountId: string;
  readonly orgId: string | null;
  readonly orgName: string | null;
  readonly plan: string | null;
  readonly provider: string;
  readonly userId: string;
}
