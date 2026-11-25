import { describe, expect, test } from 'vitest';

import {
  getAgentSetupRunMode,
  getAgentSetupRunStatus,
} from '../agent-setup-run-status';

describe('getAgentSetupRunStatus', () => {
  test('running until the terminal chunk arrives', () => {
    expect(
      getAgentSetupRunStatus({ chunks: [], done: false, error: null }),
    ).toEqual({ kind: 'running' });
  });

  test('succeeded when the terminal chunk carries no error', () => {
    expect(
      getAgentSetupRunStatus({
        chunks: [{ done: true, exitCode: 0 }],
        done: true,
        error: null,
      }),
    ).toEqual({ kind: 'succeeded' });
  });

  test('failed with the terminal exit code when it carries an error', () => {
    expect(
      getAgentSetupRunStatus({
        chunks: [{ done: false }, { done: true, exitCode: 2 }],
        done: true,
        error: 'non-zero-exit',
      }),
    ).toEqual({ error: 'non-zero-exit', exitCode: 2, kind: 'failed' });
  });

  test('failed with a null exit code when the process never exited', () => {
    expect(
      getAgentSetupRunStatus({
        chunks: [{ done: true }],
        done: true,
        error: 'timeout',
      }),
    ).toEqual({ error: 'timeout', exitCode: null, kind: 'failed' });
  });
});

describe('getAgentSetupRunMode', () => {
  test('prefers the server-echoed mode', () => {
    expect(getAgentSetupRunMode('install', 'update')).toBe('install');
  });

  test('falls back to the row intent for an unknown or missing mode', () => {
    expect(getAgentSetupRunMode(undefined, 'update')).toBe('update');
    expect(getAgentSetupRunMode('reinstall', 'install')).toBe('install');
  });
});
