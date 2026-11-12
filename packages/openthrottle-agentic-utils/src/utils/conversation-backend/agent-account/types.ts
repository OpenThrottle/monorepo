/**
 * Which agent-CLI login a turn is billed to. Each driver reports this
 * differently (a JSON status command, a text status command, a plain field in a
 * local config file), so every adapter folds its source into one
 * {@link AgentAccountIdentity}. No credential value is ever read or returned.
 */

/**
 * @public
 * @description What the runs actually bill. Mirrors `agent_accounts.credential_kind`.
 */
export const AGENT_ACCOUNT_CREDENTIAL_KINDS = {
  apiKey: 'api_key',
  subscription: 'subscription',
  unknown: 'unknown',
} as const;

/** @public */
export type AgentAccountCredentialKind =
  (typeof AGENT_ACCOUNT_CREDENTIAL_KINDS)[keyof typeof AGENT_ACCOUNT_CREDENTIAL_KINDS];

/**
 * @public
 * @description Why an account could not be identified. A stable code, so callers and the UI can
 * group on it rather than parse prose.
 */
export const AGENT_ACCOUNT_UNATTRIBUTED_REASONS = {
  notLoggedIn: 'not_logged_in',
  probeFailed: 'probe_failed',
  unknownProvider: 'unknown_provider',
  unsupported: 'unsupported',
} as const;

/** @public */
export type AgentAccountUnattributedReason =
  (typeof AGENT_ACCOUNT_UNATTRIBUTED_REASONS)[keyof typeof AGENT_ACCOUNT_UNATTRIBUTED_REASONS];

/**
 * @public
 * @description An account the CLI identified. `externalAccountId` is the stable grouping key
 * within the provider (see each adapter); every descriptive field is null when not reported.
 */
export interface IdentifiedAgentAccount {
  readonly credentialKind: AgentAccountCredentialKind;
  readonly email: string | null;
  readonly externalAccountId: string;
  readonly kind: 'identified';
  readonly orgId: string | null;
  readonly orgName: string | null;
  readonly plan: string | null;
  readonly provider: string;
}

/** @public */
export interface UnattributedAgentAccount {
  readonly kind: 'unattributed';
  readonly provider: string;
  readonly reason: AgentAccountUnattributedReason;
}

/** @public */
export type AgentAccountIdentity =
  IdentifiedAgentAccount | UnattributedAgentAccount;

/**
 * @public
 * @description The grouping key used for every API-key login: the key value is never read, so all
 * of a provider's API-key usage for one user lands in one account.
 */
export const AGENT_ACCOUNT_API_KEY_ID = 'api_key';

/** @public */
export interface ResolveAgentAccountOptions {
  /**
   * The environment the agent child runs under (HOME, config-dir overrides, binary overrides,
   * API-key presence). Pass the same env the spawn used so the account matches the run.
   */
  readonly env: NodeJS.ProcessEnv;
}
