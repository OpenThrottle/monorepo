import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getAuthToken,
  requestAuthTokenStorage,
  withMcpDeveloperAuthToken,
} from './get-auth-token.js';

describe('getAuthToken', () => {
  const originalEnvToken = process.env.MCP_DEVELOPER_AUTH_TOKEN;

  beforeEach(() => {
    delete process.env.MCP_DEVELOPER_AUTH_TOKEN;
  });

  afterEach(() => {
    if (originalEnvToken === undefined) {
      delete process.env.MCP_DEVELOPER_AUTH_TOKEN;
    } else {
      process.env.MCP_DEVELOPER_AUTH_TOKEN = originalEnvToken;
    }
  });

  it('throws when neither request store nor env provides a token', () => {
    expect(() => getAuthToken()).toThrow(/MCP_DEVELOPER_AUTH_TOKEN/);
  });

  it('returns MCP_DEVELOPER_AUTH_TOKEN from env when set', () => {
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'ot_sa_prefix_secret';

    expect(getAuthToken()).toBe('ot_sa_prefix_secret');
  });

  it('prefers per-request store over env', () => {
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'ot_sa_from_env';

    withMcpDeveloperAuthToken('ot_sa_from_request', () => {
      expect(getAuthToken()).toBe('ot_sa_from_request');
    });
  });

  it('falls through to env when request-scoped token is empty', () => {
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'ot_sa_from_env';

    withMcpDeveloperAuthToken('', () => {
      expect(getAuthToken()).toBe('ot_sa_from_env');
    });
  });

  it('trims whitespace from env token', () => {
    process.env.MCP_DEVELOPER_AUTH_TOKEN = '  ot_sa_trimmed  ';

    expect(getAuthToken()).toBe('ot_sa_trimmed');
  });

  it('does not leak request token outside async local storage', () => {
    process.env.MCP_DEVELOPER_AUTH_TOKEN = 'ot_sa_env_only';

    withMcpDeveloperAuthToken('ot_sa_scoped', () => {
      expect(getAuthToken()).toBe('ot_sa_scoped');
    });

    expect(requestAuthTokenStorage.getStore()).toBeUndefined();
    expect(getAuthToken()).toBe('ot_sa_env_only');
  });
});
