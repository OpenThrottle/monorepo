import { afterEach, describe, expect, test, vi } from 'vitest';
import { getDefaultGitHubUser } from './config.js';

/**
 * Characterization tests for the MCP-server config helpers that remain in this
 * package. Spawn-env builders moved to `@tools/workflows`
 * (`config/workflow-ralph-spawn-env.ts`); their tests live there. No process env
 * is mutated except via vi.stubEnv (auto-restored).
 */

afterEach(() => {
  vi.unstubAllEnvs();
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
