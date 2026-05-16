import { describe, expect, test } from 'vitest';
import { formatLegalDate } from '~/routing/legal/utils/formatters';

describe('routing/legal utils formatters', () => {
  test('formatLegalDate formats an ISO timestamp with date and clock', () => {
    const out = formatLegalDate('2024-06-15T12:00:00.000Z');
    expect(out).toMatch(/2024/);
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});
