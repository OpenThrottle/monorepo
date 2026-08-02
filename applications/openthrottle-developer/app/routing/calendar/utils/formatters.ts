import { format } from 'date-fns';

/**
 * Formatters for the schedule routing area. Keep these as simple, testable
 * functions that take primitives and return display strings.
 */

export const formatCalendarDate = (date: string): string => {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
};

export const formatCalendarRange = (
  startsAt: string,
  endsAt: string,
  allDay: boolean,
): string => {
  if (allDay) {
    return `${format(new Date(startsAt), 'MMM d, yyyy')} · All day`;
  }

  return `${formatCalendarDate(startsAt)} – ${format(new Date(endsAt), 'h:mm a')}`;
};

/** Format an ISO string for a native `datetime-local` input value. */
export const toDatetimeLocalValue = (iso: string): string => {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
};
