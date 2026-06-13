import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  applyWorkflowRalphSpawnIdentityOverrides,
  buildWorkflowRalphSpawnEnv,
  getDefaultGitHubUser,
  OPENTHROTTLE_POSTGRES_URL_ENV,
  WORKFLOW_RALPH_SPAWN_HOME_ENV,
  WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV,
  WORKFLOW_RALPH_TRANSPORT_ENV,
} from './config.js';

/**
 * Characterization tests for config env resolution: which env var / merged-default
 * wins, and the trim/empty-string normalization the spawn env applies. No process
 * env is mutated except via vi.stubEnv (auto-restored).
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildWorkflowRalphSpawnEnv transport selection', () => {
  test('defaults to graphql when no transport env is set', () => {
    const env = buildWorkflowRalphSpawnEnv({});
    expect(env[WORKFLOW_RALPH_TRANSPORT_ENV]).toBe('graphql');
  });

  test('honors an explicit postgres-direct transport', () => {
    const env = buildWorkflowRalphSpawnEnv({
      [WORKFLOW_RALPH_TRANSPORT_ENV]: 'postgres-direct',
    });
    expect(env[WORKFLOW_RALPH_TRANSPORT_ENV]).toBe('postgres-direct');
  });

  test('treats the legacy "postgres" alias as postgres-direct', () => {
    const env = buildWorkflowRalphSpawnEnv({
      [WORKFLOW_RALPH_TRANSPORT_ENV]: 'POSTGRES',
    });
    expect(env[WORKFLOW_RALPH_TRANSPORT_ENV]).toBe('postgres-direct');
  });

  test('falls back to merged default transport when env is unset', () => {
    const env = buildWorkflowRalphSpawnEnv(
      {},
      { mergedDefaults: { transport: 'postgres-direct' } },
    );
    expect(env[WORKFLOW_RALPH_TRANSPORT_ENV]).toBe('postgres-direct');
  });
});

describe('buildWorkflowRalphSpawnEnv credential resolution', () => {
  test('graphql transport prefers the worker auth token over workflows/mcp tokens', () => {
    const env = buildWorkflowRalphSpawnEnv({
      OPENTHROTTLE_MCP_AUTH_TOKEN: 'mcp-token',
      OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN: 'worker-token',
      OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN: 'workflows-token',
    });
    expect(env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN).toBe('worker-token');
  });

  test('graphql transport falls back to the mcp token when it is the only one set', () => {
    const env = buildWorkflowRalphSpawnEnv({
      OPENTHROTTLE_MCP_AUTH_TOKEN: 'mcp-token',
    });
    expect(env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN).toBe('mcp-token');
  });

  test('an explicit canonical graphql auth overrides any worker env token', () => {
    const env = buildWorkflowRalphSpawnEnv(
      { OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN: 'worker-token' },
      { canonicalWorkflowGraphqlAuth: 'canonical-token' },
    );
    expect(env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN).toBe('canonical-token');
  });

  test('postgres-direct transport propagates the canonical Postgres URL to both URL vars', () => {
    const env = buildWorkflowRalphSpawnEnv(
      { [WORKFLOW_RALPH_TRANSPORT_ENV]: 'postgres-direct' },
      { canonicalPostgresUrl: 'postgres://canonical/db' },
    );
    expect(env[OPENTHROTTLE_POSTGRES_URL_ENV]).toBe('postgres://canonical/db');
    expect(env.POSTGRES_URL).toBe('postgres://canonical/db');
  });
});

describe('applyWorkflowRalphSpawnIdentityOverrides', () => {
  test('returns the env unchanged when no home/xdg override is present', () => {
    const input = { PATH: '/usr/bin' };
    expect(applyWorkflowRalphSpawnIdentityOverrides(input)).toBe(input);
  });

  test('env HOME override wins over the merged default', () => {
    const result = applyWorkflowRalphSpawnIdentityOverrides(
      { [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '/env/home' },
      { spawn: { home: '/merged/home' } },
    );
    expect(result.HOME).toBe('/env/home');
  });

  test('falls back to the merged home and xdg config when env is unset', () => {
    const result = applyWorkflowRalphSpawnIdentityOverrides(
      {},
      { spawn: { home: '/merged/home', xdgConfigHome: '/merged/xdg' } },
    );
    expect(result.HOME).toBe('/merged/home');
    expect(result.XDG_CONFIG_HOME).toBe('/merged/xdg');
  });

  test('ignores whitespace-only overrides', () => {
    const input = { [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '   ' };
    const result = applyWorkflowRalphSpawnIdentityOverrides(input);
    expect(result).toBe(input);
    expect(result.HOME).toBeUndefined();
  });

  test('applies xdg override independently of home', () => {
    const result = applyWorkflowRalphSpawnIdentityOverrides({
      [WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV]: '/env/xdg',
    });
    expect(result.XDG_CONFIG_HOME).toBe('/env/xdg');
    expect(result.HOME).toBeUndefined();
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
