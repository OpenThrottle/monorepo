import { describe, expect, test } from 'vitest';
import { formatSkillUsageChartDate } from './skill-usage-chart';

describe('formatSkillUsageChartDate', () => {
  test('extracts MM-DD from a full YYYY-MM-DD date', () => {
    expect(formatSkillUsageChartDate('2026-08-12')).toBe('08-12');
  });

  test('returns the input unchanged when it is shorter than a full date', () => {
    expect(formatSkillUsageChartDate('8-12')).toBe('8-12');
    expect(formatSkillUsageChartDate('')).toBe('');
  });
});
