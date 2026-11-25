import type { CalendarViewValue } from '../types';
import { CALENDAR_VIEW } from '../types';
import type { toPlainDate } from './datetime';

type EnginePlainDate = ReturnType<typeof toPlainDate>;

/**
 * Move a plain date one view-sized step (day / month / week) in `direction`.
 */
export function shiftDate(
  date: EnginePlainDate,
  view: CalendarViewValue,
  direction: 1 | -1,
): EnginePlainDate {
  if (view === CALENDAR_VIEW.Day) {
    return date.add({ days: direction });
  }
  if (view === CALENDAR_VIEW.Month) {
    return date.add({ months: direction });
  }
  return date.add({ weeks: direction });
}
