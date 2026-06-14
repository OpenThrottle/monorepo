import type { CalendarEvent } from '~/routing/calendar/types';

/** Client-side filter until the calendar list supports server-side search. */
export const filterCalendarEventsBySearch = (
  events: CalendarEvent[],
  search: string,
): CalendarEvent[] => {
  const q = search.trim().toLowerCase();

  if (q.length === 0) {
    return events;
  }

  return events.filter((event) => {
    const title = event.title.toLowerCase();
    const location = event.location.toLowerCase();
    const description = event.description.toLowerCase();

    return title.includes(q) || location.includes(q) || description.includes(q);
  });
};

/** Look up a single stubbed event by id; null when not found. */
export const getCalendarEventById = (
  events: CalendarEvent[],
  id: string,
): CalendarEvent | null => {
  return events.find((event) => event.id === id) ?? null;
};
