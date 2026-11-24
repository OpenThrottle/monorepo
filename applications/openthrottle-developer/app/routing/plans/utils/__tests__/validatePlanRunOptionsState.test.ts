import { describe, expect, test } from 'vitest';

import type { PlanRunOptions } from '../plan-run-options';
import { getDefaultPlanRunOptions } from '../plan-run-options';
import { validatePlanRunOptionsState } from '../validatePlanRunOptionsState';

const VALID_PLAN_ID = '77cb14a0-5eb0-4061-87ea-d618b85e8818';
const VALID_TASK_ID = '45a30762-92a9-42f4-90e0-2437c7ef26a8';

// Overloaded identity helper: hands back a value typed as `T` at a boundary the
// static type cannot express (feeding an out-of-union driver to exercise the
// validator's unknown-driver branch) without a syntactic `as` cast. The
// implementation is an identity function, so runtime behavior is unchanged.
function asType<T>(value: unknown): T;
function asType(value: unknown): unknown {
  return value;
}

const baseInput = (overrides?: Partial<PlanRunOptions>): PlanRunOptions => {
  return {
    ...getDefaultPlanRunOptions({ planId: VALID_PLAN_ID }),
    ...overrides,
  };
};

/** Extracts the codes from a failed validation result for concise assertions. */
const issueCodes = (
  input: PlanRunOptions,
  iterationTimeoutText = '',
  options?: { readonly requireTargetIds?: boolean },
): readonly string[] => {
  const result = validatePlanRunOptionsState(
    input,
    iterationTimeoutText,
    options,
  );
  if (result.ok) {
    return [];
  }
  return result.issues.map((issue) => issue.code);
};

describe('validatePlanRunOptionsState', () => {
  test('returns ok:true for a valid default input', () => {
    const result = validatePlanRunOptionsState(baseInput(), '');
    expect(result.ok).toBe(true);
  });

  test('flags a non-positive-integer agent timeout', () => {
    const result = validatePlanRunOptionsState(baseInput(), 'abc');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        code: 'iteration_timeout',
        message: 'Agent timeout must be a positive whole number of seconds',
      });
    }
  });

  test('flags an agent timeout of zero', () => {
    expect(issueCodes(baseInput(), '0')).toContain('iteration_timeout');
  });

  test('allows an empty agent timeout (the default applies)', () => {
    expect(issueCodes(baseInput(), '')).not.toContain('iteration_timeout');
  });

  test('flags an unknown execution driver', () => {
    const result = validatePlanRunOptionsState(
      baseInput({
        driver: asType<PlanRunOptions['driver']>('invalid-driver'),
      }),
      '',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const driverIssue = result.issues.find(
        (issue) => issue.code === 'driver',
      );
      expect(driverIssue?.message).toContain('invalid-driver');
      expect(driverIssue?.message).toContain('Supported:');
    }
  });

  test('accepts an empty worktree name when the plan id can derive one', () => {
    expect(issueCodes(baseInput({ worktreeName: '  ' }))).not.toContain(
      'worktree_name_empty',
    );
  });

  test('does not flag an empty worktree name even with nothing to derive from', () => {
    expect(
      issueCodes(
        baseInput({
          planId: '',
          targetMode: 'task',
          taskId: '0c2720a9-920f-4b16-865a-f803eb444e18',
          worktreeName: '  ',
        }),
      ),
    ).not.toContain('worktree_name_empty');
  });

  test('allows a named worktree with a non-empty name', () => {
    expect(issueCodes(baseInput({ worktreeName: 'my-tree' }))).not.toContain(
      'worktree_name_empty',
    );
  });

  describe('when requireTargetIds is true', () => {
    test('requires a plan id in plan target mode', () => {
      expect(
        issueCodes(baseInput({ planId: '', targetMode: 'plan' }), '', {
          requireTargetIds: true,
        }),
      ).toContain('plan_required');
    });

    test('rejects a malformed plan id', () => {
      expect(
        issueCodes(
          baseInput({ planId: 'not-a-uuid', targetMode: 'plan' }),
          '',
          { requireTargetIds: true },
        ),
      ).toContain('plan_uuid');
    });

    test('accepts a valid plan uuid', () => {
      expect(
        issueCodes(
          baseInput({ planId: VALID_PLAN_ID, targetMode: 'plan' }),
          '',
          { requireTargetIds: true },
        ),
      ).not.toContain('plan_uuid');
    });

    test('requires a task id in task target mode', () => {
      expect(
        issueCodes(baseInput({ targetMode: 'task', taskId: '' }), '', {
          requireTargetIds: true,
        }),
      ).toContain('task_required');
    });

    test('rejects a malformed task id', () => {
      expect(
        issueCodes(
          baseInput({ targetMode: 'task', taskId: 'not-a-uuid' }),
          '',
          { requireTargetIds: true },
        ),
      ).toContain('task_uuid');
    });

    test('accepts a valid task uuid', () => {
      expect(
        issueCodes(
          baseInput({ targetMode: 'task', taskId: VALID_TASK_ID }),
          '',
          { requireTargetIds: true },
        ),
      ).not.toContain('task_uuid');
    });
  });

  describe('when requireTargetIds is false (default)', () => {
    test('allows an empty plan id', () => {
      expect(
        issueCodes(baseInput({ planId: '', targetMode: 'plan' })),
      ).not.toContain('plan_uuid');
    });

    test('still rejects a non-empty malformed plan id', () => {
      expect(
        issueCodes(baseInput({ planId: 'not-a-uuid', targetMode: 'plan' })),
      ).toContain('plan_uuid');
    });

    test('allows an empty task id', () => {
      expect(
        issueCodes(baseInput({ targetMode: 'task', taskId: '' })),
      ).not.toContain('task_uuid');
    });

    test('still rejects a non-empty malformed task id', () => {
      expect(
        issueCodes(baseInput({ targetMode: 'task', taskId: 'not-a-uuid' })),
      ).toContain('task_uuid');
    });
  });
});
