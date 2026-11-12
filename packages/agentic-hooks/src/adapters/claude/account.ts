/**
 * Which Claude login this session's turns are billed to, for stamping the
 * usage rows a `Stop` sends. Runs the documented `claude auth status --json`
 * (about 0.2s) under the hook's own env, so it sees the same config dir and
 * API-key presence the session does. No credential is ever read.
 *
 * It probes on every `Stop` that has rows to send rather than caching per
 * session: a mid-session `/login` to another account would otherwise keep
 * stamping the old one. Fail-open: any failure is null (an unattributed row).
 */
import type { IdentifiedAgentAccount } from '@openthrottle/openthrottle-agentic-utils';
import {
  probeClaudeAuthStatus,
  toClaudeAgentAccount,
} from '@openthrottle/openthrottle-agentic-utils';

import type { TokenUsageAccount } from '../../index.ts';

/** Kill the probe after this long; the row is then sent unattributed. @public */
export const CLAUDE_ACCOUNT_PROBE_TIMEOUT_MS = 3_000;

const CLAUDE_BIN_ENV = 'OPENTHROTTLE_CLAUDE_BIN';

/**
 * The snake_case record field for an identified account.
 *
 * @public
 */
export const toTokenUsageAccount = (
  account: IdentifiedAgentAccount,
): TokenUsageAccount => {
  return {
    credential_kind: account.credentialKind,
    email: account.email,
    external_account_id: account.externalAccountId,
    org_id: account.orgId,
    org_name: account.orgName,
    plan: account.plan,
  };
};

/**
 * The account a run under `env` bills, or null when unattributed. Never throws.
 *
 * @public
 */
export const resolveClaudeTokenUsageAccount = async (
  env: NodeJS.ProcessEnv,
): Promise<TokenUsageAccount | null> => {
  try {
    const override = env[CLAUDE_BIN_ENV]?.trim();
    const status = await probeClaudeAuthStatus({
      binary: override !== undefined && override !== '' ? override : 'claude',
      env,
      timeoutMs: CLAUDE_ACCOUNT_PROBE_TIMEOUT_MS,
    });
    const account = toClaudeAgentAccount(status);

    return account.kind === 'identified' ? toTokenUsageAccount(account) : null;
  } catch {
    return null;
  }
};
