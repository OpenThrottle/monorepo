import { describe, expect, it } from 'vitest';

import { CalendarView } from '../../types';
import { toPlainDate } from '../datetime';
import { shiftDate } from '../shift-date';

describe('shiftDate', () => {
  const start = toPlainDate('2026-06-15');

  it('moves a day at a time in the day view', () => {
    expect(shiftDate(start, CalendarView.Day, 1).toString()).toBe('2026-06-16');
  });

  it('moves a month at a time in the month view', () => {
    expect(shiftDate(start, CalendarView.Month, -1).toString()).toBe(
      '2026-05-15',
    );
  });

  it('moves a week at a time otherwise', () => {
    expect(shiftDate(start, CalendarView.Week, 1).toString()).toBe(
      '2026-06-22',
    );
  });
});
