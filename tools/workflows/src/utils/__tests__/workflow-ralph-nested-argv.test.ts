/**
 * @description Tests for nested workflow-ralph argv (runChildJob / queue processors).
 */

import { describe, expect, it } from 'vitest';
import { buildWorkflowRalphRunTuningArgv } from '../workflow-ralph-nested-argv';

describe('buildWorkflowRalphRunTuningArgv', () => {
  it('returns empty when input is empty', () => {
    expect(buildWorkflowRalphRunTuningArgv({})).toEqual([]);
  });

  it('omits backend when cursor (default)', () => {
    expect(buildWorkflowRalphRunTuningArgv({ backend: 'cursor' })).toEqual([]);
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
});
