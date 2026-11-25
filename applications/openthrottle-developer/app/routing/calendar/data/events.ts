import type { CalendarListEvent } from '~/routing/calendar/types';

/**
 * @description Stubbed schedule events backing the schedule routes until a
 * GraphQL source exists. Components and specs import from here so the sample
 * data lives in one place (see component-data boundaries). Replace with a
 * loader-fed fetch when the backend lands (plan 26594427).
 */
export const CALENDAR_EVENTS: CalendarListEvent[] = [
  {
    allDay: false,
    description: 'Daily team sync to align on priorities and blockers.',
    endsAt: '2026-06-15T09:15:00.000Z',
    id: 'evt-001',
    location: 'Zoom',
    startsAt: '2026-06-15T09:00:00.000Z',
    title: 'Team Standup',
  },
  {
    allDay: false,
    description: 'Walk through the latest product changes with stakeholders.',
    endsAt: '2026-06-16T15:00:00.000Z',
    id: 'evt-002',
    location: 'Conference Room A',
    startsAt: '2026-06-16T14:00:00.000Z',
    title: 'Product Review',
  },
  {
    allDay: false,
    description: 'Career growth and project check-in with your manager.',
    endsAt: '2026-06-17T11:30:00.000Z',
    id: 'evt-003',
    location: 'Office',
    startsAt: '2026-06-17T11:00:00.000Z',
    title: '1:1 with Manager',
  },
  {
    allDay: false,
    description: 'Set goals and milestones for the upcoming quarter.',
    endsAt: '2026-06-18T12:00:00.000Z',
    id: 'evt-004',
    location: 'HQ',
    startsAt: '2026-06-18T10:00:00.000Z',
    title: 'Quarterly Planning',
  },
  {
    allDay: true,
    description: 'Full-day company offsite — no other meetings scheduled.',
    endsAt: '2026-06-20T23:59:00.000Z',
    id: 'evt-005',
    location: 'Lakeside Lodge',
    startsAt: '2026-06-20T00:00:00.000Z',
    title: 'Company Offsite',
  },
];
