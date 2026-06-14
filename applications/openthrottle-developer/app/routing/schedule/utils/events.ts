import type { ScheduleEvent } from '~/routing/schedule/types';

/** Client-side filter until the schedule list supports server-side search. */
export const filterScheduleEventsBySearch = (
  events: ScheduleEvent[],
  search: string,
): ScheduleEvent[] => {
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
export const getScheduleEventById = (
  events: ScheduleEvent[],
  id: string,
): ScheduleEvent | null => {
  return events.find((event) => event.id === id) ?? null;
};
