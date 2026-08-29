import { describe, expect, it } from 'vitest';
import { buildPlanRunWorktreeName } from './plan-run-worktree-name.ts';

describe('buildPlanRunWorktreeName', () => {
  it('derives plan-<short plan id> from the plan uuid', () => {
    expect(
      buildPlanRunWorktreeName('5e172b67-a543-4902-8fdf-fb3a38e005b2'),
    ).toBe('plan-5e172b67');
  });

  it('is stable regardless of casing or surrounding whitespace', () => {
    expect(
      buildPlanRunWorktreeName('  5E172B67-A543-4902-8FDF-FB3A38E005B2  '),
    ).toBe('plan-5e172b67');
  });

  it('drops characters the ot-worktree skill would sanitize away', () => {
    expect(buildPlanRunWorktreeName('ab/cd ef*12345')).toBe('plan-abcdef12');
  });

  it('rejects an empty plan id rather than naming a worktree "plan-"', () => {
    expect(() => buildPlanRunWorktreeName('   ')).toThrow(/non-empty plan id/);
  });
});
