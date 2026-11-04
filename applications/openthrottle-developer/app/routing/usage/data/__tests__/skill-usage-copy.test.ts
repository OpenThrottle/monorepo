import { describe, expect, test } from 'vitest';

import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPE_BADGE_COLORS,
  skillUsageAvgDurationLabel,
  skillUsageCwdLabel,
  skillUsageOutcomesLabel,
  skillUsageScopeBadgeColor,
  skillUsageScopeLabel,
} from '../skill-usage-copy';

describe('skillUsageScopeLabel', () => {
  test('maps known scope ids to human labels and echoes unknowns', () => {
    expect(skillUsageScopeLabel('ours')).toBe('Ours');
    expect(skillUsageScopeLabel('personal')).toBe('Personal');
    expect(skillUsageScopeLabel('third-party')).toBe('Third-party');
    expect(skillUsageScopeLabel('mystery')).toBe('mystery');
  });
});

describe('skillUsageScopeBadgeColor', () => {
  test('gives every scope its own colour', () => {
    const colors = Object.values(SKILL_USAGE_SCOPE_BADGE_COLORS);

    expect(new Set(colors).size).toBe(colors.length);
  });

  test('does not colour a personal skill as third-party', () => {
    // The original bug: the Scope tile was a binary ternary, so a personal
    // invocation fell through to the third-party colour.
    expect(skillUsageScopeBadgeColor('personal')).toBe('violet');
    expect(skillUsageScopeBadgeColor('personal')).not.toBe(
      skillUsageScopeBadgeColor('third-party'),
    );
  });

  test('maps ours and third-party to their established colours', () => {
    expect(skillUsageScopeBadgeColor('ours')).toBe('green');
    expect(skillUsageScopeBadgeColor('third-party')).toBe('orange');
  });

  test('falls back to third-party, never ours, for an unknown scope', () => {
    expect(skillUsageScopeBadgeColor('mystery')).toBe('orange');
  });
});

describe('skillUsageCwdLabel', () => {
  test('returns the basename of a path', () => {
    expect(skillUsageCwdLabel('/home/matt/openthrottle')).toBe('openthrottle');
    expect(skillUsageCwdLabel('/home/matt/openthrottle/')).toBe('openthrottle');
  });

  test('returns the input when there is no separator segment', () => {
    expect(skillUsageCwdLabel('solo')).toBe('solo');
    expect(skillUsageCwdLabel('')).toBe('');
  });
});

describe('skillUsageAvgDurationLabel', () => {
  test('em dash for missing samples, ms under a second, seconds otherwise', () => {
    expect(skillUsageAvgDurationLabel(null)).toBe('—');
    expect(skillUsageAvgDurationLabel(undefined)).toBe('—');
    expect(skillUsageAvgDurationLabel(250)).toBe('250ms');
    expect(skillUsageAvgDurationLabel(1500)).toBe('1.5s');
  });
});

describe('skillUsageOutcomesLabel', () => {
  test('renders count/total, em dash when none reported', () => {
    expect(skillUsageOutcomesLabel(3, 5)).toBe('3/5');
    expect(skillUsageOutcomesLabel(0, 5)).toBe('—');
  });
});

describe('SKILL_USAGE_COPY.intro', () => {
  test('interpolates the range length', () => {
    expect(SKILL_USAGE_COPY.intro(30)).toContain('last 30 days');
  });
});
