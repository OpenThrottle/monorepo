import { describe, expect, it } from 'vitest';

import {
  CLAUDE_ACTIVE_CREDENTIALS,
  parseClaudeAuthStatus,
} from '../auth-status.ts';
import {
  CLAUDE_NOT_LOGGED_IN_WARNING,
  claudeApiKeyOverrideWarning,
} from '../data/data.copy.ts';

const SUBSCRIPTION_JSON = JSON.stringify({
  authMethod: 'claude.ai',
  email: 'dev@example.com',
  loggedIn: true,
  orgName: 'Example Org',
  subscriptionType: 'team',
});

describe('parseClaudeAuthStatus', () => {
  describe('subscription login', () => {
    it('reports the account, plan and subscription credential', () => {
      expect(
        parseClaudeAuthStatus(SUBSCRIPTION_JSON, { hasAnthropicApiKey: false }),
      ).toEqual({
        accountEmail: 'dev@example.com',
        activeCredential: CLAUDE_ACTIVE_CREDENTIALS.subscription,
        apiKeyOverridesSubscription: false,
        authMethod: 'claude.ai',
        loggedIn: true,
        organizationName: 'Example Org',
        subscriptionType: 'team',
        warning: null,
      });
    });
  });

  describe('api key overriding a subscription', () => {
    it('warns loudly when the server env carries ANTHROPIC_API_KEY', () => {
      const status = parseClaudeAuthStatus(SUBSCRIPTION_JSON, {
        hasAnthropicApiKey: true,
      });

      expect(status.activeCredential).toBe(CLAUDE_ACTIVE_CREDENTIALS.apiKey);
      expect(status.apiKeyOverridesSubscription).toBe(true);
      expect(status.warning).toBe(
        claudeApiKeyOverrideWarning('team', 'ANTHROPIC_API_KEY'),
      );
      expect(status.warning).toContain('Unset it to use the subscription');
    });

    it('treats a reported ANTHROPIC_API_KEY apiKeySource as an active key', () => {
      const status = parseClaudeAuthStatus(
        JSON.stringify({
          apiKeySource: 'ANTHROPIC_API_KEY',
          authMethod: 'claude.ai',
          loggedIn: true,
          subscriptionType: 'max',
        }),
        { hasAnthropicApiKey: false },
      );

      expect(status.activeCredential).toBe(CLAUDE_ACTIVE_CREDENTIALS.apiKey);
      expect(status.apiKeyOverridesSubscription).toBe(true);
    });

    it('names an apiKeyHelper source in the warning', () => {
      const status = parseClaudeAuthStatus(
        JSON.stringify({
          apiKeySource: 'apiKeyHelper',
          authMethod: 'claude.ai',
          loggedIn: true,
          subscriptionType: 'pro',
        }),
        { hasAnthropicApiKey: false },
      );

      expect(status.activeCredential).toBe(CLAUDE_ACTIVE_CREDENTIALS.apiKey);
      expect(status.warning).toBe(
        claudeApiKeyOverrideWarning('pro', 'apiKeyHelper'),
      );
    });

    it('does not treat apiKeySource "none" as a key', () => {
      const status = parseClaudeAuthStatus(
        JSON.stringify({
          apiKeySource: 'none',
          authMethod: 'claude.ai',
          loggedIn: true,
          subscriptionType: 'pro',
        }),
        { hasAnthropicApiKey: false },
      );

      expect(status.activeCredential).toBe(
        CLAUDE_ACTIVE_CREDENTIALS.subscription,
      );
      expect(status.warning).toBeNull();
    });
  });

  describe('not logged in', () => {
    it('reports no credential and a login warning', () => {
      const status = parseClaudeAuthStatus(
        JSON.stringify({ loggedIn: false }),
        { hasAnthropicApiKey: false },
      );

      expect(status.loggedIn).toBe(false);
      expect(status.activeCredential).toBe(CLAUDE_ACTIVE_CREDENTIALS.none);
      expect(status.warning).toBe(CLAUDE_NOT_LOGGED_IN_WARNING);
    });

    it('uses the api key without a warning when logged out but a key is set', () => {
      const status = parseClaudeAuthStatus(
        JSON.stringify({ loggedIn: false }),
        { hasAnthropicApiKey: true },
      );

      expect(status.activeCredential).toBe(CLAUDE_ACTIVE_CREDENTIALS.apiKey);
      expect(status.apiKeyOverridesSubscription).toBe(false);
      expect(status.warning).toBeNull();
    });
  });

  describe('garbage input', () => {
    it.each([
      '',
      'not json',
      '[]',
      'null',
      '42',
      '{"loggedIn":"yes","email":5}',
    ])('degrades %j to a not-logged-in status with null fields', (stdout) => {
      const status = parseClaudeAuthStatus(stdout, {
        hasAnthropicApiKey: false,
      });

      expect(status).toMatchObject({
        accountEmail: null,
        activeCredential: CLAUDE_ACTIVE_CREDENTIALS.none,
        authMethod: null,
        loggedIn: false,
        organizationName: null,
        subscriptionType: null,
        warning: CLAUDE_NOT_LOGGED_IN_WARNING,
      });
    });
  });
});
