/**
 * Pure projections from each driver's identity source to an
 * {@link AgentAccountIdentity}. IO lives in `resolve-agent-account.ts`; these
 * take the raw text/JSON so every branch is unit-testable with fixtures.
 */

import type { ClaudeAuthStatus } from '../claude/auth-status.ts';
import { CLAUDE_ACTIVE_CREDENTIALS } from '../claude/auth-status.ts';
import type {
  AgentAccountIdentity,
  AgentAccountUnattributedReason,
} from './types.ts';
import {
  AGENT_ACCOUNT_API_KEY_ID,
  AGENT_ACCOUNT_CREDENTIAL_KINDS,
  AGENT_ACCOUNT_UNATTRIBUTED_REASONS,
} from './types.ts';

// eslint-disable-next-line no-control-regex -- strips terminal colour codes from CLI output
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const CURSOR_EMAIL_PATTERN = /logged in as\s+(\S+@\S+)/i;
const CURSOR_TEAM_PATTERN = /team:\s*(.+?)\s*\(id\s*([^)\s]+)\)/i;
const CODEX_API_KEY_MODES = new Set(['api_key', 'apikey']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonRecord(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function apiKeyAccount(provider: string): AgentAccountIdentity {
  return {
    credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.apiKey,
    email: null,
    externalAccountId: AGENT_ACCOUNT_API_KEY_ID,
    kind: 'identified',
    orgId: null,
    orgName: null,
    plan: null,
    provider,
  };
}

function unattributed(
  provider: string,
  reason: AgentAccountUnattributedReason,
): AgentAccountIdentity {
  return { kind: 'unattributed', provider, reason };
}

/**
 * @public
 * @description claude, from `claude auth status --json` (already projected by
 * `parseClaudeAuthStatus`). Key: `<orgId>:<email>`, so one person's personal and company logins
 * are two accounts. An active API key wins over a login in `-p` mode, so it is the billed account.
 */
export function toClaudeAgentAccount(
  status: ClaudeAuthStatus | null,
): AgentAccountIdentity {
  const provider = 'claude';

  if (status === null) {
    return unattributed(
      provider,
      AGENT_ACCOUNT_UNATTRIBUTED_REASONS.probeFailed,
    );
  }

  if (status.activeCredential === CLAUDE_ACTIVE_CREDENTIALS.apiKey) {
    return apiKeyAccount(provider);
  }

  const email = status.accountEmail?.toLowerCase() ?? null;
  const key = [status.organizationId, email]
    .filter((part) => part !== null)
    .join(':');

  if (!status.loggedIn || key === '') {
    return unattributed(
      provider,
      AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
    );
  }

  return {
    credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.subscription,
    email,
    externalAccountId: key,
    kind: 'identified',
    orgId: status.organizationId,
    orgName: status.organizationName,
    plan: status.subscriptionType,
    provider,
  };
}

/**
 * @public
 * @description cursor, from `cursor-agent status` text ("Logged in as <email>",
 * "Team: <name> (id <n>)"). Key: the email. `hasApiKey` is `CURSOR_API_KEY` presence.
 */
export function toCursorAgentAccount(
  stdout: string | null,
  hasApiKey: boolean,
): AgentAccountIdentity {
  const provider = 'cursor';

  if (hasApiKey) {
    return apiKeyAccount(provider);
  }

  if (stdout === null) {
    return unattributed(
      provider,
      AGENT_ACCOUNT_UNATTRIBUTED_REASONS.probeFailed,
    );
  }

  const text = stdout.replace(ANSI_PATTERN, '');
  const email = CURSOR_EMAIL_PATTERN.exec(text)?.[1]?.toLowerCase() ?? null;

  if (email === null || /not logged in/i.test(text)) {
    return unattributed(
      provider,
      AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
    );
  }

  const team = CURSOR_TEAM_PATTERN.exec(text);

  return {
    credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.subscription,
    email,
    externalAccountId: email,
    kind: 'identified',
    orgId: team?.[2] ?? null,
    orgName: team?.[1] ?? null,
    plan: null,
    provider,
  };
}

/**
 * @public
 * @description codex, from `auth.json` under CODEX_HOME (default `~/.codex`). Reads ONLY
 * `auth_mode` and `tokens.account_id`; the id_token is never decoded and no other token field is
 * touched, so there is no email or plan. Key: the account id.
 */
export function toCodexAgentAccount(
  authJson: string | null,
): AgentAccountIdentity {
  const provider = 'codex';
  const record = authJson === null ? null : readJsonRecord(authJson);

  if (record === null) {
    return unattributed(
      provider,
      AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
    );
  }

  const authMode = readString(record, 'auth_mode')?.toLowerCase() ?? null;
  if (authMode !== null && CODEX_API_KEY_MODES.has(authMode)) {
    return apiKeyAccount(provider);
  }

  const tokens = record.tokens;
  const accountId = isRecord(tokens) ? readString(tokens, 'account_id') : null;

  if (accountId === null) {
    return unattributed(
      provider,
      AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
    );
  }

  return {
    credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.subscription,
    email: null,
    externalAccountId: accountId,
    kind: 'identified',
    orgId: null,
    orgName: null,
    plan: null,
    provider,
  };
}

/**
 * @public
 * @description antigravity (`agy`), from `~/.gemini/google_accounts.json` → `active` (a plain
 * email; the OAuth credentials live in a different file that is never read). A Gemini/Google API
 * key in the env wins. Key: the email.
 */
export function toAntigravityAgentAccount(
  googleAccountsJson: string | null,
  hasApiKey: boolean,
): AgentAccountIdentity {
  const provider = 'antigravity';

  if (hasApiKey) {
    return apiKeyAccount(provider);
  }

  const record =
    googleAccountsJson === null ? null : readJsonRecord(googleAccountsJson);
  const active = record === null ? null : readString(record, 'active');
  const email = active?.toLowerCase() ?? null;

  if (email === null) {
    return unattributed(
      provider,
      AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
    );
  }

  return {
    credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.subscription,
    email,
    externalAccountId: email,
    kind: 'identified',
    orgId: null,
    orgName: null,
    plan: null,
    provider,
  };
}
