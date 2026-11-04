import { describe, expect, test } from 'vitest';

import { CHAT_USAGE_LIMIT_COPY } from '../../data/data.copy';
import { formatUsageLimitMessage } from '../format-usage-limit-message';

describe('formatUsageLimitMessage', () => {
  test('returns only the limit line when the reset time is null', () => {
    expect(formatUsageLimitMessage(null)).toBe(
      CHAT_USAGE_LIMIT_COPY.limitReached,
    );
  });

  test('returns only the limit line when the reset time is not a date', () => {
    expect(formatUsageLimitMessage('soon')).toBe(
      CHAT_USAGE_LIMIT_COPY.limitReached,
    );
  });

  test('appends the reset clause when the reset time parses', () => {
    const message = formatUsageLimitMessage('2027-01-15T08:00:00.000Z');

    expect(message).toContain(CHAT_USAGE_LIMIT_COPY.limitReached);
    expect(message).toContain(CHAT_USAGE_LIMIT_COPY.resetsPrefix);
  });
});
