import { describe, expect, test } from 'vitest';
import {
  DEFAULT_RALPH_PROMPT,
  getDefaultWorkflowRalphRunOptionsInput,
  type WorkflowRalphRunOptionsInput,
} from '../workflow-ralph-config';
import { validateWorkflowRalphRunOptionsState } from '../workflow-ralph-validate';

const VALID_PLAN_ID = '77cb14a0-5eb0-4061-87ea-d618b85e8818';
const VALID_TASK_ID = '45a30762-92a9-42f4-90e0-2437c7ef26a8';

// Overloaded identity helper: hands back a value typed as `T` at a boundary the
// static type cannot express (feeding an out-of-union backend to exercise the
// validator's unknown-backend branch) without a syntactic `as` cast. The
// implementation is an identity function, so runtime behavior is unchanged.
function asType<T>(value: unknown): T;
function asType(value: unknown): unknown {
  return value;
}

const baseInput = (
  overrides?: Partial<WorkflowRalphRunOptionsInput>,
): WorkflowRalphRunOptionsInput => ({
  ...getDefaultWorkflowRalphRunOptionsInput({ planId: VALID_PLAN_ID }),
  ...overrides,
});

/** Extracts the codes from a failed validation result for concise assertions. */
const issueCodes = (
  input: WorkflowRalphRunOptionsInput,
  iterationTimeoutText = '',
  options?: { readonly requireCliTargetIds?: boolean },
): readonly string[] => {
  const result = validateWorkflowRalphRunOptionsState(
    input,
    iterationTimeoutText,
    options,
  );
  if (result.ok) {
    return [];
  }
  return result.issues.map((issue) => issue.code);
};

describe('validateWorkflowRalphRunOptionsState', () => {
  test('returns ok:true for a valid default input', () => {
    const result = validateWorkflowRalphRunOptionsState(baseInput(), '');
    expect(result.ok).toBe(true);
  });

  test('flags a non-positive-integer --iteration-timeout', () => {
    const result = validateWorkflowRalphRunOptionsState(baseInput(), 'abc');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        code: 'iteration_timeout',
        message: '--iteration-timeout must be a positive integer (seconds)',
      });
    }
  });

  test('flags an --iteration-timeout of zero', () => {
    expect(issueCodes(baseInput(), '0')).toContain('iteration_timeout');
  });

  test('allows an empty --iteration-timeout (flag omitted)', () => {
    expect(issueCodes(baseInput(), '')).not.toContain('iteration_timeout');
  });

  test('flags --iterations less than 1', () => {
    const result = validateWorkflowRalphRunOptionsState(
      baseInput({ iterations: 0 }),
      '',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        code: 'iterations',
        message: '--iterations must be a positive integer greater than 0',
      });
      // The same non-positive value also fails the nested enqueue-tuning parity check.
      expect(result.issues).toContainEqual({
        code: 'enqueue_iterations',
        message:
          'Nested Ralph tuning: iterations must be a positive integer (parity with CLI)',
      });
    }
  });

  test('flags a non-finite --iterations value', () => {
    expect(issueCodes(baseInput({ iterations: Number.NaN }))).toContain(
      'iterations',
    );
  });

  test('flags an unknown execution backend', () => {
    const result = validateWorkflowRalphRunOptionsState(
      baseInput({
        executionBackend:
          asType<WorkflowRalphRunOptionsInput['executionBackend']>(
            'invalid-backend',
          ),
      }),
      '',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const backendIssue = result.issues.find(
        (issue) => issue.code === 'backend',
      );
      expect(backendIssue?.message).toContain('invalid-backend');
      expect(backendIssue?.message).toContain('Supported:');
    }
  });

  test('flags combining --prompt-file with a named --prompt', () => {
    expect(
      issueCodes(
        baseInput({ promptFile: 'prompts/one.md', promptLayer: 'named' }),
      ),
    ).toContain('prompt_conflict');
  });

  test('flags combining --prompt-file with a non-default --prompt', () => {
    expect(
      issueCodes(
        baseInput({
          prompt: '/custom-prompt',
          promptFile: 'prompts/one.md',
          promptLayer: 'file',
        }),
      ),
    ).toContain('prompt_conflict');
  });

  test('allows --prompt-file when --prompt is still the default', () => {
    expect(
      issueCodes(
        baseInput({
          prompt: DEFAULT_RALPH_PROMPT,
          promptFile: 'prompts/one.md',
          promptLayer: 'file',
        }),
      ),
    ).not.toContain('prompt_conflict');
  });

  test('flags an empty --prompt-file path when using the file prompt layer', () => {
    expect(
      issueCodes(baseInput({ promptFile: '', promptLayer: 'file' })),
    ).toContain('prompt_file_empty');
  });

  test('accepts an empty worktree name when the plan id can derive one', () => {
    expect(
      issueCodes(baseInput({ worktreeCli: 'named', worktreeName: '  ' })),
    ).not.toContain('worktree_name_empty');
  });

  test('does not flag an empty worktree name even with nothing to derive from', () => {
    expect(
      issueCodes(
        baseInput({
          planId: '',
          targetMode: 'task',
          taskId: '0c2720a9-920f-4b16-865a-f803eb444e18',
          worktreeCli: 'named',
          worktreeName: '  ',
        }),
      ),
    ).not.toContain('worktree_name_empty');
  });

  test('allows a named --worktree with a non-empty name', () => {
    expect(
      issueCodes(baseInput({ worktreeCli: 'named', worktreeName: 'my-tree' })),
    ).not.toContain('worktree_name_empty');
  });

  test('flags --worktree-base on a non-cursor backend', () => {
    expect(
      issueCodes(
        baseInput({ executionBackend: 'claude', worktreeBase: '/tmp/base' }),
      ),
    ).toContain('worktree_base_claude');
  });

  test('flags --skip-worktree-setup on a non-cursor backend', () => {
    expect(
      issueCodes(
        baseInput({ executionBackend: 'claude', skipWorktreeSetup: true }),
      ),
    ).toContain('skip_worktree_setup_claude');
  });

  test('allows --worktree-base and --skip-worktree-setup on the cursor backend', () => {
    expect(
      issueCodes(
        baseInput({
          executionBackend: 'cursor',
          skipWorktreeSetup: true,
          worktreeBase: '/tmp/base',
        }),
      ),
    ).not.toEqual(
      expect.arrayContaining([
        'worktree_base_claude',
        'skip_worktree_setup_claude',
      ]),
    );
  });

  describe('when requireCliTargetIds is true', () => {
    test('requires a --plan id in plan target mode', () => {
      expect(
        issueCodes(baseInput({ planId: '', targetMode: 'plan' }), '', {
          requireCliTargetIds: true,
        }),
      ).toContain('plan_required');
    });

    test('rejects a malformed --plan id', () => {
      expect(
        issueCodes(
          baseInput({ planId: 'not-a-uuid', targetMode: 'plan' }),
          '',
          { requireCliTargetIds: true },
        ),
      ).toContain('plan_uuid');
    });

    test('accepts a valid --plan uuid', () => {
      expect(
        issueCodes(
          baseInput({ planId: VALID_PLAN_ID, targetMode: 'plan' }),
          '',
          { requireCliTargetIds: true },
        ),
      ).not.toContain('plan_uuid');
    });

    test('requires a --task id in task target mode', () => {
      expect(
        issueCodes(baseInput({ targetMode: 'task', taskId: '' }), '', {
          requireCliTargetIds: true,
        }),
      ).toContain('task_required');
    });

    test('rejects a malformed --task id', () => {
      expect(
        issueCodes(
          baseInput({ targetMode: 'task', taskId: 'not-a-uuid' }),
          '',
          { requireCliTargetIds: true },
        ),
      ).toContain('task_uuid');
    });

    test('accepts a valid --task uuid', () => {
      expect(
        issueCodes(
          baseInput({ targetMode: 'task', taskId: VALID_TASK_ID }),
          '',
          { requireCliTargetIds: true },
        ),
      ).not.toContain('task_uuid');
    });
  });

  describe('when requireCliTargetIds is false (default)', () => {
    test('allows an empty --plan id', () => {
      expect(
        issueCodes(baseInput({ planId: '', targetMode: 'plan' })),
      ).not.toContain('plan_uuid');
    });

    test('still rejects a non-empty malformed --plan id', () => {
      expect(
        issueCodes(baseInput({ planId: 'not-a-uuid', targetMode: 'plan' })),
      ).toContain('plan_uuid');
    });

    test('allows an empty --task id', () => {
      expect(
        issueCodes(baseInput({ targetMode: 'task', taskId: '' })),
      ).not.toContain('task_uuid');
    });

    test('still rejects a non-empty malformed --task id', () => {
      expect(
        issueCodes(baseInput({ targetMode: 'task', taskId: 'not-a-uuid' })),
      ).toContain('task_uuid');
    });
  });
});
