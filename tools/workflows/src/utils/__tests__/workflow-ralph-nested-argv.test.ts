/**
 * @description Tests for nested workflow-ralph argv (runChildJob / queue processors).
 */

import { describe, expect, it } from 'vitest';
import { RALPH_WORKTREE_FLAG_ONLY } from '../ralph-worktree-cli';
import {
  buildWorkflowRalphRunTuningArgv,
  mergeRalphNestedRunTuningWithExecutionBackend,
  normalizeRalphNestedDebugCli,
} from '../workflow-ralph-nested-argv';

describe('normalizeRalphNestedDebugCli', () => {
  it('returns lowercase debug and verbose values', () => {
    expect(normalizeRalphNestedDebugCli('debug')).toBe('debug');
    expect(normalizeRalphNestedDebugCli('verbose')).toBe('verbose');
    expect(normalizeRalphNestedDebugCli('omit')).toBe('omit');
  });

  it('normalizes legacy uppercase DEBUG and VERBOSE', () => {
    expect(normalizeRalphNestedDebugCli('DEBUG')).toBe('debug');
    expect(normalizeRalphNestedDebugCli('VERBOSE')).toBe('verbose');
  });

  it('maps truthy aliases to debug and verbose', () => {
    expect(normalizeRalphNestedDebugCli('1')).toBe('debug');
    expect(normalizeRalphNestedDebugCli('true')).toBe('debug');
    expect(normalizeRalphNestedDebugCli('2')).toBe('verbose');
    expect(normalizeRalphNestedDebugCli('all')).toBe('verbose');
  });

  it('maps omit aliases to omit', () => {
    expect(normalizeRalphNestedDebugCli('0')).toBe('omit');
    expect(normalizeRalphNestedDebugCli('false')).toBe('omit');
    expect(normalizeRalphNestedDebugCli('off')).toBe('omit');
  });

  it('returns undefined for unknown values', () => {
    expect(normalizeRalphNestedDebugCli('maybe')).toBeUndefined();
    expect(normalizeRalphNestedDebugCli(null)).toBeUndefined();
  });
});

describe('buildWorkflowRalphRunTuningArgv', () => {
  it('returns empty when input is empty', () => {
    expect(buildWorkflowRalphRunTuningArgv({})).toEqual([]);
  });

  it('omits backend when cursor (default)', () => {
    expect(buildWorkflowRalphRunTuningArgv({ backend: 'cursor' })).toEqual([]);
  });

  it('includes --backend claude (non-default runner)', () => {
    expect(buildWorkflowRalphRunTuningArgv({ backend: 'claude' })).toEqual([
      '--backend',
      'claude',
    ]);
  });

  it('includes --iterations when set', () => {
    expect(buildWorkflowRalphRunTuningArgv({ iterations: 7 })).toEqual([
      '--iterations',
      '7',
    ]);
  });

  it('includes --prompt when not default', () => {
    expect(
      buildWorkflowRalphRunTuningArgv({ prompt: '/agents/custom' }),
    ).toEqual(['--prompt', '/agents/custom']);
  });

  it('prefers --prompt-file over prompt', () => {
    expect(
      buildWorkflowRalphRunTuningArgv({
        prompt: '/agents/ignored',
        promptFile: '.cursor/commands/agents/ralph.md',
      }),
    ).toEqual(['--prompt-file', '.cursor/commands/agents/ralph.md']);
  });

  it('includes --debug and --verbose when set', () => {
    expect(buildWorkflowRalphRunTuningArgv({ debug: 'debug' })).toEqual([
      '--debug',
    ]);
    expect(buildWorkflowRalphRunTuningArgv({ debug: 'verbose' })).toEqual([
      '--verbose',
    ]);
  });

  it('normalizes legacy uppercase DEBUG and VERBOSE debug values', () => {
    expect(
      buildWorkflowRalphRunTuningArgv({ debug: 'DEBUG' as 'debug' }),
    ).toEqual(['--debug']);
    expect(
      buildWorkflowRalphRunTuningArgv({ debug: 'VERBOSE' as 'verbose' }),
    ).toEqual(['--verbose']);
  });

  it('includes --worktree argv when set', () => {
    expect(buildWorkflowRalphRunTuningArgv({ worktree: 'target-one' })).toEqual(
      ['--worktree', 'target-one'],
    );
  });

  it('includes flag-only --worktree when sentinel', () => {
    expect(
      buildWorkflowRalphRunTuningArgv({ worktree: RALPH_WORKTREE_FLAG_ONLY }),
    ).toEqual(['--worktree']);
  });

  it('includes cursor-only worktree-base and skip-worktree-setup', () => {
    expect(
      buildWorkflowRalphRunTuningArgv({
        skipWorktreeSetup: true,
        worktree: 'wt',
        worktreeBase: 'main',
      }),
    ).toEqual([
      '--worktree',
      'wt',
      '--worktree-base',
      'main',
      '--skip-worktree-setup',
    ]);
  });
});

describe('mergeRalphNestedRunTuningWithExecutionBackend', () => {
  it('fills backend from executionBackend when ralph omits backend', () => {
    expect(
      mergeRalphNestedRunTuningWithExecutionBackend(undefined, 'claude'),
    ).toEqual({ backend: 'claude' });
    expect(
      buildWorkflowRalphRunTuningArgv(
        mergeRalphNestedRunTuningWithExecutionBackend(undefined, 'claude'),
      ),
    ).toEqual(['--backend', 'claude']);
  });

  it('prefers explicit ralph.backend over executionBackend', () => {
    expect(
      mergeRalphNestedRunTuningWithExecutionBackend(
        { backend: 'cursor', iterations: 2 },
        'claude',
      ),
    ).toEqual({ backend: 'cursor', iterations: 2 });
  });

  it('defaults to cursor when both are absent', () => {
    expect(
      mergeRalphNestedRunTuningWithExecutionBackend(undefined, undefined),
    ).toEqual({
      backend: 'cursor',
    });
  });

  it('normalizes legacy uppercase debug on merge', () => {
    expect(
      mergeRalphNestedRunTuningWithExecutionBackend(
        { debug: 'VERBOSE' as 'verbose' },
        'cursor',
      ),
    ).toEqual({ backend: 'cursor', debug: 'verbose' });
    expect(
      buildWorkflowRalphRunTuningArgv(
        mergeRalphNestedRunTuningWithExecutionBackend(
          { debug: 'DEBUG' as 'debug' },
          'cursor',
        ),
      ),
    ).toEqual(['--debug']);
  });
});
