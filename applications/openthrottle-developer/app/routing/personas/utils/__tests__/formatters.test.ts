import { format } from 'date-fns';
import { describe, expect, test } from 'vitest';
import { formatPersonasDate } from '../formatters';

describe('formatPersonasDate', () => {
  test('formats an ISO date string using the shared date-fns pattern', () => {
    const iso = '2026-03-14T18:30:00.000Z';
    expect(formatPersonasDate(iso)).toBe(
      format(new Date(iso), 'MMM d, yyyy h:mm a'),
    );
  });

  test('reflects a different input timestamp', () => {
    const iso = '2025-12-01T00:05:00.000Z';
    expect(formatPersonasDate(iso)).toBe(
      format(new Date(iso), 'MMM d, yyyy h:mm a'),
    );
  });
});
