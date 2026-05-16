import { format } from 'date-fns';
import { describe, expect, test } from 'vitest';
import { formatPullRequestsDate } from '../formatters';

describe('formatPullRequestsDate', () => {
  test('matches date-fns output for the same parsed instant', () => {
    const iso = '2026-03-15T14:30:00.000Z';
    expect(formatPullRequestsDate(iso)).toBe(
      format(new Date(iso), 'MMM d, yyyy h:mm a'),
    );
  });
});
