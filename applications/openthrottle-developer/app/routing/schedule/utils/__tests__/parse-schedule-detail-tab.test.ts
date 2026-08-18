import { describe, expect, test } from 'vitest';
import {
  SCHEDULE_DETAIL_TAB_SEARCH_PARAM,
  parseScheduleDetailTab,
} from '../parse-schedule-detail-tab';

describe('parseScheduleDetailTab', () => {
  test('uses the shared `tab` search param', () => {
    expect(SCHEDULE_DETAIL_TAB_SEARCH_PARAM).toBe('tab');
  });

  test.each(['history', 'prompt'] as const)('accepts %p', (raw) => {
    expect(parseScheduleDetailTab(raw)).toBe(raw);
  });

  test.each([null, '', 'bogus', 'History', 'runs'])(
    'returns null for %p',
    (raw) => {
      expect(parseScheduleDetailTab(raw)).toBeNull();
    },
  );
});
