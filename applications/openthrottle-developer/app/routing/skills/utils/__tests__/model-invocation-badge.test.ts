import { describe, expect, test } from 'vitest';
import {
  getModelInvocationBadge,
  getResolvedModelInvocationDisplay,
} from '~/routing/skills/utils/model-invocation-badge';

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

describe('getResolvedModelInvocationDisplay', () => {
  test('falls back to the tri-state static badge when no resolved value is present', () => {
    const display = getResolvedModelInvocationDisplay({
      disableModelInvocation: undefined,
      effectiveDisableModelInvocation: undefined,
    });

    expect(display.hasResolved).toBe(false);
    expect(display.isOverridden).toBe(false);
    expect(display.badge.label).toBe('Default (auto)');
  });

  test('shows the effective badge when resolved (never the tri-state default)', () => {
    const display = getResolvedModelInvocationDisplay({
      disableModelInvocation: undefined,
      effectiveDisableModelInvocation: true,
    });

    expect(display.hasResolved).toBe(true);
    expect(display.badge.label).toBe('Manual only');
  });

  test('flags an override when effective diverges from static (unset → true)', () => {
    const display = getResolvedModelInvocationDisplay({
      disableModelInvocation: undefined,
      effectiveDisableModelInvocation: true,
    });

    expect(display.isOverridden).toBe(true);
  });

  test('flags an override when a statically-disabled skill is re-enabled', () => {
    const display = getResolvedModelInvocationDisplay({
      disableModelInvocation: true,
      effectiveDisableModelInvocation: false,
    });

    expect(display.isOverridden).toBe(true);
    expect(display.badge.label).toBe('Auto enabled');
  });

  test('no override when effective matches the normalized static value (unset → false)', () => {
    const display = getResolvedModelInvocationDisplay({
      disableModelInvocation: undefined,
      effectiveDisableModelInvocation: false,
    });

    expect(display.hasResolved).toBe(true);
    expect(display.isOverridden).toBe(false);
    expect(display.badge.label).toBe('Auto enabled');
  });
});
