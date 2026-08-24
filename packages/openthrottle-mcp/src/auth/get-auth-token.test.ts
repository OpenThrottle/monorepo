import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getAuthToken,
  refreshEnvAuthTokenFromFile,
  requestAuthTokenStorage,
  resetEnvAuthTokenRefreshForTests,
  withMcpDeveloperAuthToken,
} from './get-auth-token.ts';

describe('getAuthToken', () => {
  const originalEnvToken = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;

  beforeEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  afterEach(() => {
    if (originalEnvToken === undefined) {
      delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    } else {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = originalEnvToken;
    }
  });

  it('throws when neither request store nor env provides a token', () => {
    expect(() => getAuthToken()).toThrow(/OPENTHROTTLE_MCP_AUTH_TOKEN/);
  });

  it('returns OPENTHROTTLE_MCP_AUTH_TOKEN from env when set', () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_prefix_secret';

    expect(getAuthToken()).toBe('ot_sa_prefix_secret');
  });

  it('prefers per-request store over env', () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_from_env';

    withMcpDeveloperAuthToken('ot_sa_from_request', () => {
      expect(getAuthToken()).toBe('ot_sa_from_request');
    });
  });

  it('falls through to env when request-scoped token is empty', () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_from_env';

    withMcpDeveloperAuthToken('', () => {
      expect(getAuthToken()).toBe('ot_sa_from_env');
    });
  });

  it('trims whitespace from env token', () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = '  ot_sa_trimmed  ';

    expect(getAuthToken()).toBe('ot_sa_trimmed');
  });

  it('does not leak request token outside async local storage', () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_env_only';

    withMcpDeveloperAuthToken('ot_sa_scoped', () => {
      expect(getAuthToken()).toBe('ot_sa_scoped');
    });

    expect(requestAuthTokenStorage.getStore()).toBeUndefined();
    expect(getAuthToken()).toBe('ot_sa_env_only');
  });
});

describe('refreshEnvAuthTokenFromFile (mid-session .env re-resolution)', () => {
  const originalEnvToken = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  const originalFile = process.env.OT_MCP_AUTH_TOKEN_ENV_FILE;
  const originalRefreshMs = process.env.OT_MCP_TOKEN_REFRESH_MS;
  let dir: string;
  let envFile: string;

  const restore = (name: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  };

  beforeEach(() => {
    resetEnvAuthTokenRefreshForTests();
    dir = mkdtempSync(join(tmpdir(), 'ot-mcp-token-'));
    envFile = join(dir, '.env');
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    delete process.env.OT_MCP_TOKEN_REFRESH_MS;
    process.env.OT_MCP_AUTH_TOKEN_ENV_FILE = envFile;
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
    restore('OPENTHROTTLE_MCP_AUTH_TOKEN', originalEnvToken);
    restore('OT_MCP_AUTH_TOKEN_ENV_FILE', originalFile);
    restore('OT_MCP_TOKEN_REFRESH_MS', originalRefreshMs);
    resetEnvAuthTokenRefreshForTests();
  });

  it('is a no-op when no source file is recorded', () => {
    delete process.env.OT_MCP_AUTH_TOKEN_ENV_FILE;
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_boot';

    refreshEnvAuthTokenFromFile();

    expect(process.env.OPENTHROTTLE_MCP_AUTH_TOKEN).toBe('ot_sa_boot');
  });

  it('picks up a token rotated in .env without relaunch', () => {
    writeFileSync(envFile, 'OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_boot\n');
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_boot';

    // .env rotated to a new token after boot.
    writeFileSync(envFile, 'OPENTHROTTLE_MCP_AUTH_TOKEN="ot_sa_rotated"\n');

    expect(getAuthToken()).toBe('ot_sa_rotated');
  });

  it('throttles re-reads to OT_MCP_TOKEN_REFRESH_MS', () => {
    process.env.OT_MCP_TOKEN_REFRESH_MS = '5000';
    writeFileSync(envFile, 'OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_boot\n');
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_boot';

    refreshEnvAuthTokenFromFile(1_000);
    writeFileSync(envFile, 'OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_rotated\n');

    // Within the throttle window: not re-read yet.
    refreshEnvAuthTokenFromFile(2_000);
    expect(process.env.OPENTHROTTLE_MCP_AUTH_TOKEN).toBe('ot_sa_boot');

    // Past the window: re-read.
    refreshEnvAuthTokenFromFile(7_500);
    expect(process.env.OPENTHROTTLE_MCP_AUTH_TOKEN).toBe('ot_sa_rotated');
  });

  it('OT_MCP_TOKEN_REFRESH_MS=0 disables re-resolution', () => {
    process.env.OT_MCP_TOKEN_REFRESH_MS = '0';
    writeFileSync(envFile, 'OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_rotated\n');
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_boot';

    refreshEnvAuthTokenFromFile();

    expect(process.env.OPENTHROTTLE_MCP_AUTH_TOKEN).toBe('ot_sa_boot');
  });

  it('never clobbers a valid token when the file is missing or empty', () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_boot';
    // envFile was never written → readFile fails.
    refreshEnvAuthTokenFromFile();
    expect(process.env.OPENTHROTTLE_MCP_AUTH_TOKEN).toBe('ot_sa_boot');

    // File exists but has no/empty token line.
    writeFileSync(envFile, 'OTHER=1\nOPENTHROTTLE_MCP_AUTH_TOKEN=\n');
    resetEnvAuthTokenRefreshForTests();
    refreshEnvAuthTokenFromFile();
    expect(process.env.OPENTHROTTLE_MCP_AUTH_TOKEN).toBe('ot_sa_boot');
  });

  it('does not run when a per-request token is present', () => {
    writeFileSync(envFile, 'OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_rotated\n');
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_boot';

    withMcpDeveloperAuthToken('ot_sa_request', () => {
      expect(getAuthToken()).toBe('ot_sa_request');
    });
    // env untouched: the request-scoped path short-circuits before refresh.
    expect(process.env.OPENTHROTTLE_MCP_AUTH_TOKEN).toBe('ot_sa_boot');
  });
});
