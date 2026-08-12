import { describe, expect, test } from 'vitest';
import type { CalendarListEvent } from '~/routing/calendar/types';
import { filterCalendarEventsBySearch, getCalendarEventById } from '../events';

const buildEvent = (
  overrides: Partial<CalendarListEvent> = {},
): CalendarListEvent => ({
  allDay: false,
  description: 'Quarterly planning session',
  endsAt: '2026-08-12T13:00:00.000Z',
  id: 'event-1',
  location: 'Conference Room A',
  startsAt: '2026-08-12T12:00:00.000Z',
  title: 'Team Sync',
  ...overrides,
});

describe('filterCalendarEventsBySearch', () => {
  const events = [
    buildEvent({ id: 'event-1', title: 'Team Sync' }),
    buildEvent({
      description: 'Discuss the roadmap',
      id: 'event-2',
      location: 'Zoom',
      title: 'Roadmap Review',
    }),
    buildEvent({
      description: 'Nothing special',
      id: 'event-3',
      location: 'Break Room',
      title: 'Lunch',
    }),
  ];

  test('returns all events when search is empty', () => {
    expect(filterCalendarEventsBySearch(events, '')).toEqual(events);
  });

  test('returns all events when search is only whitespace', () => {
    expect(filterCalendarEventsBySearch(events, '   ')).toEqual(events);
  });

  test('matches on title case-insensitively', () => {
    const result = filterCalendarEventsBySearch(events, 'SYNC');
    expect(result.map((event) => event.id)).toEqual(['event-1']);
  });

  test('matches on location', () => {
    const result = filterCalendarEventsBySearch(events, 'zoom');
    expect(result.map((event) => event.id)).toEqual(['event-2']);
  });

  test('matches on description', () => {
    const result = filterCalendarEventsBySearch(events, 'roadmap');
    expect(result.map((event) => event.id).sort()).toEqual(['event-2']);
  });

  test('returns an empty list when nothing matches', () => {
    expect(filterCalendarEventsBySearch(events, 'no-match')).toEqual([]);
  });
});

describe('getCalendarEventById', () => {
  const events = [buildEvent({ id: 'event-1' }), buildEvent({ id: 'event-2' })];

  test('returns the matching event', () => {
    expect(getCalendarEventById(events, 'event-2')).toEqual(
      buildEvent({ id: 'event-2' }),
    );
  });

  test('returns null when no event matches', () => {
    expect(getCalendarEventById(events, 'missing')).toBeNull();
  });

  test('returns null for an empty list', () => {
    expect(getCalendarEventById([], 'event-1')).toBeNull();
  });
});
