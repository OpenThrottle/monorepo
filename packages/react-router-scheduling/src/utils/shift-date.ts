import { CalendarView } from '../types';
import type { toPlainDate } from './datetime';

type EnginePlainDate = ReturnType<typeof toPlainDate>;

/**
 * Move a plain date one view-sized step (day / month / week) in `direction`.
 */
export function shiftDate(
  date: EnginePlainDate,
  view: CalendarView,
  direction: 1 | -1,
): EnginePlainDate {
  if (view === CalendarView.Day) {
    return date.add({ days: direction });
  }
  if (view === CalendarView.Month) {
    return date.add({ months: direction });
  }
  return date.add({ weeks: direction });
}
