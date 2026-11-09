import { describe, expect, it } from 'vitest';

import { describeWorkflowAccountError } from '../account-error-description.ts';

describe('describeWorkflowAccountError', () => {
  describe('when the CLI billed ANTHROPIC_API_KEY from the server env', () => {
    it('names the key and offers both fixes for a billing error', () => {
      const description = describeWorkflowAccountError({
        apiKeySource: 'ANTHROPIC_API_KEY',
        kind: 'billing_error',
        message: 'Credit balance is too low',
      });

      expect(description).toBe(
        `Agent account error (billing_error): Credit balance is too low. The agent CLI authenticated with ANTHROPIC_API_KEY from the server's environment. Fix: top up that API organization's credit, or unset ANTHROPIC_API_KEY and restart the server so the CLI uses its own login; then re-run the plan.`,
      );
    });

    it('asks for a valid key on an authentication error', () => {
      const description = describeWorkflowAccountError({
        apiKeySource: 'ANTHROPIC_API_KEY',
        kind: 'authentication_error',
        message: null,
      });

      expect(description).toContain(
        'Agent account error (authentication_error).',
      );
      expect(description).toContain('replace that key with a valid one');
      expect(description).toContain('unset ANTHROPIC_API_KEY');
    });
  });

  describe('when the CLI used its own login', () => {
    it('points at the logged-in account and never mentions the env key', () => {
      const description = describeWorkflowAccountError({
        apiKeySource: 'none',
        kind: 'authentication_error',
        message: 'Invalid API key',
      });

      expect(description).toContain('its own login');
      expect(description).toContain('claude /login');
      expect(description).not.toContain('ANTHROPIC_API_KEY');
    });
  });

  describe('when the CLI did not report its credential', () => {
    it('says so and falls back to the login fix', () => {
      const description = describeWorkflowAccountError({
        apiKeySource: null,
        kind: 'permission_error',
        message: null,
      });

      expect(description).toContain('did not report which credential');
      expect(description).toContain('access to the requested model');
    });
  });

  describe('when the source is some other credential', () => {
    it('names it verbatim', () => {
      const description = describeWorkflowAccountError({
        apiKeySource: 'apiKeyHelper',
        kind: 'billing_error',
        message: null,
      });

      expect(description).toContain('authenticated with apiKeyHelper.');
    });
  });
});
