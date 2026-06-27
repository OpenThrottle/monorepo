import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  getDefaultGitHubUser,
  getPostgresConfig,
  resolveActor,
} from './config.ts';

/**
 * Characterization tests for the MCP-server config helpers that remain in this
 * package. Spawn-env builders moved to `@tools/workflows`
 * (`config/workflow-ralph-spawn-env.ts`); their tests live there. No process env
 * is mutated except via vi.stubEnv (auto-restored).
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getPostgresConfig', () => {
  test('returns the connection config when POSTGRES_URL is set', () => {
    vi.stubEnv('OPENTHROTTLE_POSTGRES_URL', '');
    vi.stubEnv('POSTGRES_URL', 'postgresql://user:pass@localhost:5432/db');
    expect(getPostgresConfig()).toEqual({
      connectionString: 'postgresql://user:pass@localhost:5432/db',
    });
  });

  test('returns undefined when Postgres env vars are unset', () => {
    vi.stubEnv('OPENTHROTTLE_POSTGRES_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    vi.stubEnv('POSTGRES_DB', '');
    vi.stubEnv('POSTGRES_HOST', '');
    vi.stubEnv('POSTGRES_PASSWORD', '');
    vi.stubEnv('POSTGRES_PORT', '');
    vi.stubEnv('POSTGRES_USER', '');
    expect(getPostgresConfig()).toBeUndefined();
  });
});

describe('getDefaultGitHubUser', () => {
  test('returns the trimmed GITHUB_USER when set', () => {
    vi.stubEnv('GITHUB_USER', '  octocat  ');
    expect(getDefaultGitHubUser()).toBe('octocat');
  });

  test('returns undefined when GITHUB_USER is empty or whitespace', () => {
    vi.stubEnv('GITHUB_USER', '   ');
    expect(getDefaultGitHubUser()).toBeUndefined();
  });
});

describe('resolveActor', () => {
  test('GITHUB_USER override wins over any caller-supplied value', () => {
    expect(resolveActor('display-name', 'octocat')).toBe('octocat');
    expect(resolveActor(null, 'octocat')).toBe('octocat');
    expect(resolveActor(undefined, 'octocat')).toBe('octocat');
  });

  test('falls back to caller value when no override', () => {
    expect(resolveActor('alice', undefined)).toBe('alice');
  });

  test('falls back to null when neither override nor caller value', () => {
    expect(resolveActor(undefined, undefined)).toBeNull();
    expect(resolveActor(null, undefined)).toBeNull();
  });
});
