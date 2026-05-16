import { describe, expect, test } from 'vitest';
import { formatSkillsDate } from '~/routing/profile/utils/formatters';

describe('routing/profile utils formatters', () => {
  test('formatSkillsDate formats an ISO timestamp with date and clock', () => {
    const out = formatSkillsDate('2024-06-15T12:00:00.000Z');
    expect(out).toMatch(/2024/);
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});
