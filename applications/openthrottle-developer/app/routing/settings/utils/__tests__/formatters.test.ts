import { describe, expect, test } from 'vitest';
import { formatSettingsDate } from '../formatters';

describe('routing/settings utils formatters', () => {
  test('formatSettingsDate formats an ISO timestamp with date and clock', () => {
    const out = formatSettingsDate('2024-06-15T12:00:00.000Z');
    expect(out).toMatch(/Jun/);
    expect(out).toMatch(/2024/);
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});
