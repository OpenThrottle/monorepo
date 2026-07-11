import { describe, expect, test } from 'vitest';
import { getModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';

describe('getModelInvocationBadge', () => {
  test('true → amber "Manual only"', () => {
    const badge = getModelInvocationBadge(true);

    expect(badge.color).toBe('amber');
    expect(badge.label).toBe('Manual only');
    expect(badge.tooltip).toMatch(/suppressed/i);
  });

  test('false → green "Auto enabled"', () => {
    const badge = getModelInvocationBadge(false);

    expect(badge.color).toBe('green');
    expect(badge.label).toBe('Auto enabled');
    expect(badge.tooltip).toMatch(/explicitly enabled/i);
  });

  test('undefined (unset) → slate "Default (auto)"', () => {
    const badge = getModelInvocationBadge(undefined);

    expect(badge.color).toBe('slate');
    expect(badge.label).toBe('Default (auto)');
    expect(badge.tooltip).toMatch(/unset/i);
  });
});
