import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_ERROR_KINDS,
  parseClaudeAccountError,
  parseClaudeApiKeySource,
} from '../account-error.ts';

const apiErrorAssistant = (error: unknown, text: string): unknown => {
  return {
    error,
    isApiErrorMessage: true,
    message: {
      content: [{ text, type: 'text' }],
      model: '<synthetic>',
      role: 'assistant',
    },
    type: 'assistant',
  };
};

describe('parseClaudeAccountError', () => {
  describe('assistant API-error messages', () => {
    it('maps billing_error to a billing account error with its text', () => {
      expect(
        parseClaudeAccountError(
          apiErrorAssistant('billing_error', 'Credit balance is too low'),
        ),
      ).toEqual({
        kind: ACCOUNT_ERROR_KINDS.billingError,
        message: 'Credit balance is too low',
      });
    });

    it('maps authentication_error and authentication_failed to authentication', () => {
      expect(
        parseClaudeAccountError(
          apiErrorAssistant('authentication_error', 'Invalid API key'),
        ),
      ).toEqual({ kind: 'authentication_error', message: 'Invalid API key' });

      expect(
        parseClaudeAccountError(
          apiErrorAssistant('authentication_failed', 'Invalid API key'),
        ),
      ).toEqual({ kind: 'authentication_error', message: 'Invalid API key' });
    });

    it('maps permission_error to a permission account error', () => {
      expect(
        parseClaudeAccountError(apiErrorAssistant('permission_error', 'nope')),
      ).toEqual({ kind: 'permission_error', message: 'nope' });
    });

    it('accepts an { type } error object and an error nested on the message', () => {
      expect(
        parseClaudeAccountError(
          apiErrorAssistant({ type: 'billing_error' }, 'low'),
        ),
      ).toEqual({ kind: 'billing_error', message: 'low' });

      expect(
        parseClaudeAccountError({
          message: { content: [], error: 'permission_error' },
          type: 'assistant',
        }),
      ).toEqual({ kind: 'permission_error', message: null });
    });
  });

  describe('non-fatal API errors', () => {
    it.each([
      'rate_limit',
      'server_error',
      'overloaded_error',
      'invalid_request',
      'api_error',
      'unknown',
    ])('does not map %s', (error) => {
      expect(
        parseClaudeAccountError(apiErrorAssistant(error, 'try again')),
      ).toBeNull();
    });

    it('does not map an ordinary assistant message', () => {
      expect(
        parseClaudeAccountError({
          message: { content: [{ text: 'hi', type: 'text' }] },
          type: 'assistant',
        }),
      ).toBeNull();
    });

    it('does not map a 429 or 500 error result', () => {
      expect(
        parseClaudeAccountError({
          api_error_status: 429,
          is_error: true,
          result: 'limited',
          type: 'result',
        }),
      ).toBeNull();

      expect(
        parseClaudeAccountError({
          api_error_status: 500,
          is_error: true,
          result: 'boom',
          type: 'result',
        }),
      ).toBeNull();
    });
  });

  describe('error results', () => {
    it('maps a result whose error field is a fatal class', () => {
      expect(
        parseClaudeAccountError({
          error: 'billing_error',
          is_error: true,
          result: 'Credit balance is too low',
          type: 'result',
        }),
      ).toEqual({
        kind: 'billing_error',
        message: 'Credit balance is too low',
      });
    });

    it('maps a 401 result to authentication and a 403 result to permission', () => {
      expect(
        parseClaudeAccountError({
          api_error_status: 401,
          is_error: true,
          result: 'Invalid API key',
          type: 'result',
        }),
      ).toEqual({ kind: 'authentication_error', message: 'Invalid API key' });

      expect(
        parseClaudeAccountError({
          api_error_status: 403,
          is_error: true,
          type: 'result',
        }),
      ).toEqual({ kind: 'permission_error', message: null });
    });

    it('ignores a successful result even if it carries a fatal error name', () => {
      expect(
        parseClaudeAccountError({
          error: 'billing_error',
          is_error: false,
          type: 'result',
        }),
      ).toBeNull();
    });
  });

  it('returns null for non-records and other event types', () => {
    expect(parseClaudeAccountError(null)).toBeNull();
    expect(parseClaudeAccountError('billing_error')).toBeNull();
    expect(
      parseClaudeAccountError({ error: 'billing_error', type: 'system' }),
    ).toBeNull();
  });
});

describe('parseClaudeApiKeySource', () => {
  it('reads apiKeySource from the system/init event', () => {
    expect(
      parseClaudeApiKeySource({
        apiKeySource: 'ANTHROPIC_API_KEY',
        subtype: 'init',
        type: 'system',
      }),
    ).toBe('ANTHROPIC_API_KEY');

    expect(
      parseClaudeApiKeySource({
        apiKeySource: 'none',
        subtype: 'init',
        type: 'system',
      }),
    ).toBe('none');
  });

  it('returns null when absent or on any other event', () => {
    expect(
      parseClaudeApiKeySource({ subtype: 'init', type: 'system' }),
    ).toBeNull();
    expect(
      parseClaudeApiKeySource({
        apiKeySource: 'none',
        subtype: 'hook_started',
        type: 'system',
      }),
    ).toBeNull();
    expect(parseClaudeApiKeySource({ type: 'result' })).toBeNull();
  });
});
