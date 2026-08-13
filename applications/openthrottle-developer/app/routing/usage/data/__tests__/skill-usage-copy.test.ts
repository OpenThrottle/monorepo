import { describe, expect, test } from 'vitest';
import {
  SKILL_USAGE_COPY,
  skillUsageAvgDurationLabel,
  skillUsageCwdLabel,
  skillUsageOutcomesLabel,
  skillUsageScopeLabel,
} from '../skill-usage-copy';

describe('skillUsageScopeLabel', () => {
  test('maps known scope ids to human labels and echoes unknowns', () => {
    expect(skillUsageScopeLabel('ours')).toBe('Ours');
    expect(skillUsageScopeLabel('third-party')).toBe('Third-party');
    expect(skillUsageScopeLabel('mystery')).toBe('mystery');
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
