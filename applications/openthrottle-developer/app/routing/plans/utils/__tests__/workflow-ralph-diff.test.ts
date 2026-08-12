import { describe, expect, test } from 'vitest';
import {
  getDefaultWorkflowRalphRunOptionsInput,
  type WorkflowRalphRunOptionsInput,
} from '../workflow-ralph-config';
import { buildWorkflowRalphTuningDiffLabels } from '../workflow-ralph-diff';

const baseline: WorkflowRalphRunOptionsInput =
  getDefaultWorkflowRalphRunOptionsInput({ planId: 'plan-1' });

describe('buildWorkflowRalphTuningDiffLabels', () => {
  test('returns no lines when the input matches the baseline defaults', () => {
    expect(buildWorkflowRalphTuningDiffLabels(baseline, '')).toEqual([]);
  });

  test('reports a backend change', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      executionBackend: 'claude',
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain('Backend: cursor → claude (--backend)');
  });

  test('reports an iterations change', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      iterations: 25,
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain('Iterations: 10 → 25 (--iterations)');
  });

  test('reports an iteration timeout change parsed from the text field', () => {
    const lines = buildWorkflowRalphTuningDiffLabels(baseline, '45');
    expect(lines).toContain(
      'Iteration timeout (seconds): omit → 45 (--iteration-timeout)',
    );
  });

  test('ignores an unparseable iteration timeout text (still omitted)', () => {
    expect(buildWorkflowRalphTuningDiffLabels(baseline, 'nope')).toEqual([]);
  });

  test('reports a model change, substituting the default label for an empty model', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      model: 'gpt-5',
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain('Model: auto → gpt-5 (--model)');
  });

  test('reports an Nx project change', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      project: 'openthrottle-developer',
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain(
      'Nx project: omit → openthrottle-developer (--project)',
    );
  });

  test('reports a prompt-delivery change when the prompt layer differs', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      promptFile: 'PROMPT.md',
      promptLayer: 'file',
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain(
      'Prompt delivery differs from baseline (--prompt vs --prompt-file; see Configuration).',
    );
  });

  test('reports a debug CLI change', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      debugCli: 'verbose',
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain('Debug CLI: omit → verbose (--debug / --verbose)');
  });

  test('reports a worktree CLI mode change', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      worktreeCli: 'flag-only',
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain('Agent worktree: omit → flag-only (--worktree)');
  });

  test('reports the worktree CLI change (not the name line) when both change together', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      worktreeCli: 'named',
      worktreeName: 'my-worktree',
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain('Agent worktree: omit → named (--worktree)');
    expect(lines.some((line) => line.startsWith('Agent worktree name:'))).toBe(
      false,
    );
  });

  test('reports a worktree base change', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      worktreeBase: '/tmp/worktrees',
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain(
      'Worktree base: omit → /tmp/worktrees (--worktree-base, Cursor only)',
    );
  });

  test('reports a skip-worktree-setup change', () => {
    const input: WorkflowRalphRunOptionsInput = {
      ...baseline,
      skipWorktreeSetup: true,
    };
    const lines = buildWorkflowRalphTuningDiffLabels(input, '');
    expect(lines).toContain(
      'Skip worktree setup: false → true (--skip-worktree-setup, Cursor only)',
    );
  });
});
