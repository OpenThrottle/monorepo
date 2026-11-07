import { describe, expect, test } from 'vitest';

import {
  getAgentSetupStatusLabel,
  getAgentSetupTitle,
} from '../agent-setup-status-label';

describe('getAgentSetupTitle', () => {
  test('install mode', () => {
    expect(getAgentSetupTitle('install', 'Grok')).toBe('Installing Grok');
  });

  test('update mode', () => {
    expect(getAgentSetupTitle('update', 'OpenCode')).toBe('Updating OpenCode');
  });
});

describe('getAgentSetupStatusLabel', () => {
  test('running', () => {
    expect(getAgentSetupStatusLabel({ kind: 'running' })).toBe('Running…');
  });

  test('succeeded', () => {
    expect(getAgentSetupStatusLabel({ kind: 'succeeded' })).toBe(
      'Finished successfully',
    );
  });

  describe('failed', () => {
    test('with exit code and error', () => {
      expect(
        getAgentSetupStatusLabel({
          error: 'boom',
          exitCode: 1,
          kind: 'failed',
        }),
      ).toBe('Failed (exit code 1): boom');
    });

    test('with exit code only', () => {
      expect(
        getAgentSetupStatusLabel({
          error: null,
          exitCode: 127,
          kind: 'failed',
        }),
      ).toBe('Failed (exit code 127)');
    });

    test('with error only', () => {
      expect(
        getAgentSetupStatusLabel({
          error: 'spawn failed',
          exitCode: null,
          kind: 'failed',
        }),
      ).toBe('Failed: spawn failed');
    });

    test('with neither', () => {
      expect(
        getAgentSetupStatusLabel({
          error: null,
          exitCode: null,
          kind: 'failed',
        }),
      ).toBe('Failed');
    });
  });
});
