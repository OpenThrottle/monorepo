/**
 * @public
 * @description What an agent account's runs actually billed — the values of
 * `agent_accounts.credential_kind` (CHECK-constrained in migration 158).
 */
export const AGENT_ACCOUNT_CREDENTIAL_KINDS = {
  API_KEY: 'api_key',
  SUBSCRIPTION: 'subscription',
  UNKNOWN: 'unknown',
} as const;
