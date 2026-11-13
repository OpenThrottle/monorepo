import { describe, expect, it } from 'vitest';

import type { ClaudeAuthStatus } from '../../claude/auth-status.ts';
import { CLAUDE_ACTIVE_CREDENTIALS } from '../../claude/auth-status.ts';
import {
  toAntigravityAgentAccount,
  toClaudeAgentAccount,
  toCodexAgentAccount,
  toCursorAgentAccount,
} from '../parse.ts';
import {
  AGENT_ACCOUNT_API_KEY_ID,
  AGENT_ACCOUNT_CREDENTIAL_KINDS,
  AGENT_ACCOUNT_UNATTRIBUTED_REASONS,
} from '../types.ts';

const claudeStatus = (
  overrides: Partial<ClaudeAuthStatus>,
): ClaudeAuthStatus => {
  return {
    accountEmail: 'Dev@Example.com',
    activeCredential: CLAUDE_ACTIVE_CREDENTIALS.subscription,
    apiKeyOverridesSubscription: false,
    authMethod: 'claude.ai',
    loggedIn: true,
    organizationId: 'org-1',
    organizationName: 'Example Org',
    subscriptionType: 'team',
    warning: null,
    ...overrides,
  };
};

const apiKeyAccount = (provider: string): object => {
  return {
    credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.apiKey,
    externalAccountId: AGENT_ACCOUNT_API_KEY_ID,
    kind: 'identified',
    provider,
  };
};

describe('toClaudeAgentAccount', () => {
  describe('when a subscription login is active', () => {
    it('keys the account on org and lowercased email and keeps the plan', () => {
      expect(toClaudeAgentAccount(claudeStatus({}))).toEqual({
        credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.subscription,
        email: 'dev@example.com',
        externalAccountId: 'org-1:dev@example.com',
        kind: 'identified',
        orgId: 'org-1',
        orgName: 'Example Org',
        plan: 'team',
        provider: 'claude',
      });
    });
  });

  describe('when an API key is the active credential', () => {
    it('attributes the run to the API-key account', () => {
      const status = claudeStatus({
        activeCredential: CLAUDE_ACTIVE_CREDENTIALS.apiKey,
        apiKeyOverridesSubscription: true,
      });

      expect(toClaudeAgentAccount(status)).toMatchObject(
        apiKeyAccount('claude'),
      );
    });
  });

  describe('when logged out', () => {
    it('is unattributed as not logged in', () => {
      const status = claudeStatus({
        accountEmail: null,
        activeCredential: CLAUDE_ACTIVE_CREDENTIALS.none,
        loggedIn: false,
        organizationId: null,
      });

      expect(toClaudeAgentAccount(status)).toEqual({
        kind: 'unattributed',
        provider: 'claude',
        reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
      });
    });
  });

  describe('when the probe failed', () => {
    it('is unattributed as a probe failure', () => {
      expect(toClaudeAgentAccount(null)).toEqual({
        kind: 'unattributed',
        provider: 'claude',
        reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.probeFailed,
      });
    });
  });
});

describe('toCursorAgentAccount', () => {
  const loggedIn = `\u001b[32m✓\u001b[0m Logged in as Dev@Example.com\nTeam: Example (id 5466894)\n`;

  describe('when logged in on a team', () => {
    it('reads the email and the team name and id, ignoring colour codes', () => {
      expect(toCursorAgentAccount(loggedIn, false)).toEqual({
        credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.subscription,
        email: 'dev@example.com',
        externalAccountId: 'dev@example.com',
        kind: 'identified',
        orgId: '5466894',
        orgName: 'Example',
        plan: null,
        provider: 'cursor',
      });
    });
  });

  describe('when logged in without a team', () => {
    it('leaves the org null', () => {
      expect(
        toCursorAgentAccount('Logged in as dev@example.com\n', false),
      ).toMatchObject({ email: 'dev@example.com', orgId: null, orgName: null });
    });
  });

  describe('when CURSOR_API_KEY is set', () => {
    it('attributes the run to the API-key account', () => {
      expect(toCursorAgentAccount(loggedIn, true)).toMatchObject(
        apiKeyAccount('cursor'),
      );
    });
  });

  describe('when logged out or the output is unrecognised', () => {
    it.each(['Not logged in\n', '', 'garbage output'])(
      'is unattributed as not logged in for %j',
      (stdout) => {
        expect(toCursorAgentAccount(stdout, false)).toMatchObject({
          kind: 'unattributed',
          reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
        });
      },
    );
  });

  describe('when the status command could not run', () => {
    it('is unattributed as a probe failure', () => {
      expect(toCursorAgentAccount(null, false)).toMatchObject({
        reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.probeFailed,
      });
    });
  });
});

describe('toCodexAgentAccount', () => {
  describe('when logged in with ChatGPT', () => {
    it('keys the account on tokens.account_id only', () => {
      const authJson = JSON.stringify({
        auth_mode: 'chatgpt',
        tokens: {
          access_token: 'not-read',
          account_id: 'acct-123',
          id_token: 'header.payload.signature',
        },
      });

      expect(toCodexAgentAccount(authJson)).toEqual({
        credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.subscription,
        email: null,
        externalAccountId: 'acct-123',
        kind: 'identified',
        orgId: null,
        orgName: null,
        plan: null,
        provider: 'codex',
      });
    });
  });

  describe('when logged in with an API key', () => {
    it('attributes the run to the API-key account', () => {
      expect(
        toCodexAgentAccount(JSON.stringify({ auth_mode: 'apikey' })),
      ).toMatchObject(apiKeyAccount('codex'));
    });
  });

  describe('when there is no usable auth file', () => {
    it.each([
      [null],
      ['not json'],
      ['[]'],
      [JSON.stringify({ auth_mode: 'chatgpt', tokens: {} })],
    ])('is unattributed as not logged in for %j', (authJson) => {
      expect(toCodexAgentAccount(authJson)).toMatchObject({
        kind: 'unattributed',
        reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
      });
    });
  });
});

describe('toAntigravityAgentAccount', () => {
  describe('when a Google account is active', () => {
    it('keys the account on the active email', () => {
      const json = JSON.stringify({ active: 'Dev@Example.com', old: [] });

      expect(toAntigravityAgentAccount(json, false)).toMatchObject({
        email: 'dev@example.com',
        externalAccountId: 'dev@example.com',
        kind: 'identified',
        provider: 'antigravity',
      });
    });
  });

  describe('when a Gemini or Google API key is set', () => {
    it('attributes the run to the API-key account', () => {
      expect(toAntigravityAgentAccount(null, true)).toMatchObject(
        apiKeyAccount('antigravity'),
      );
    });
  });

  describe('when no account is active', () => {
    it.each([[null], ['{}'], ['{"active":null}'], ['broken']])(
      'is unattributed as not logged in for %j',
      (json) => {
        expect(toAntigravityAgentAccount(json, false)).toMatchObject({
          reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.notLoggedIn,
        });
      },
    );
  });
});
