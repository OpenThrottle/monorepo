import { describe, expect, test } from 'vitest';
import {
  skillUsageLastUsedLabel,
  skillUsageSuccessRateLabel,
} from './skill-usage-detail';

describe('skillUsageSuccessRateLabel', () => {
  test('rounds success over reported outcomes to a percentage', () => {
    expect(skillUsageSuccessRateLabel(3, 4)).toBe('75%');
    expect(skillUsageSuccessRateLabel(1, 3)).toBe('33%');
  });

  test('renders an em dash when no outcomes were reported', () => {
    expect(skillUsageSuccessRateLabel(0, 0)).toBe('—');
  });
});

describe('skillUsageLastUsedLabel', () => {
  const now = Date.parse('2026-08-12T12:00:00.000Z');

  test('returns "Never" for absent or unparseable timestamps', () => {
    expect(skillUsageLastUsedLabel(null, now)).toBe('Never');
    expect(skillUsageLastUsedLabel('not-a-date', now)).toBe('Never');
  });

  test('formats a relative label using the injected now', () => {
    expect(skillUsageLastUsedLabel('2026-08-09T12:00:00.000Z', now)).toBe(
      '3 days ago',
    );
    expect(skillUsageLastUsedLabel('2026-08-12T10:00:00.000Z', now)).toBe(
      '2 hours ago',
    );
  });
});
