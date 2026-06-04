/**
 * @description Tests for nested workflow-ralph argv (runChildJob / queue processors).
 */

import { describe, expect, it } from 'vitest';
import { RALPH_WORKTREE_FLAG_ONLY } from '../ralph-worktree-cli';
import {
  buildWorkflowRalphRunTuningArgv,
  mergeRalphNestedRunTuningWithExecutionBackend,
} from '../workflow-ralph-nested-argv';

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
        promptFile: '.cursor/skills/agents-ralph/SKILL.md',
      }),
    ).toEqual(['--prompt-file', '.cursor/skills/agents-ralph/SKILL.md']);
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
