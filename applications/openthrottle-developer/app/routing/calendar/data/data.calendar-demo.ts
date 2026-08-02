import {
  RecurrenceFrequency,
  RecurrenceWeekday,
  buildRRule,
} from '@openthrottle/react-router-scheduling';
import type { CalendarEvent } from '@openthrottle/react-router-scheduling';

/**
 * @description Sample events for the scheduling-calendar demo route, exercising
 * the @openthrottle/react-router-scheduling package across week and month views
 * (timed + all-day events, plus recurring series built with `buildRRule`). Stub
 * data lives here so the route and any specs share one source (see
 * component-data boundaries). Replace with a loader-fed fetch when a backend
 * source exists.
 */
export const CALENDAR_DEMO_EVENTS: CalendarEvent[] = [
  {
    description: 'Daily team sync.',
    end: '2026-06-15T09:15:00.000Z',
    id: 'cal-001',
    location: 'Zoom',
    start: '2026-06-15T09:00:00.000Z',
    title: 'Standup',
  },
  {
    description: 'Review the latest product changes.',
    end: '2026-06-15T15:00:00.000Z',
    id: 'cal-002',
    location: 'Room A',
    start: '2026-06-15T14:00:00.000Z',
    title: 'Product Review',
  },
  {
    end: '2026-06-16T11:30:00.000Z',
    id: 'cal-003',
    location: 'Office',
    start: '2026-06-16T11:00:00.000Z',
    title: '1:1 with Manager',
  },
  {
    end: '2026-06-16T13:00:00.000Z',
    id: 'cal-004',
    start: '2026-06-16T12:00:00.000Z',
    title: 'Lunch & Learn',
  },
  {
    description: 'Plan the upcoming sprint.',
    end: '2026-06-17T11:00:00.000Z',
    id: 'cal-005',
    location: 'Room B',
    start: '2026-06-17T10:00:00.000Z',
    title: 'Sprint Planning',
  },
  {
    end: '2026-06-17T16:30:00.000Z',
    id: 'cal-006',
    start: '2026-06-17T16:00:00.000Z',
    title: 'Design Critique',
  },
  {
    end: '2026-06-18T10:30:00.000Z',
    id: 'cal-007',
    start: '2026-06-18T09:30:00.000Z',
    title: 'Architecture Sync',
  },
  {
    end: '2026-06-18T15:00:00.000Z',
    id: 'cal-008',
    location: 'Room C',
    start: '2026-06-18T14:00:00.000Z',
    title: 'Customer Call',
  },
  {
    end: '2026-06-19T12:00:00.000Z',
    id: 'cal-009',
    start: '2026-06-19T11:00:00.000Z',
    title: 'Retro',
  },
  {
    allDay: true,
    description: 'Company-wide day off.',
    end: '2026-06-19',
    id: 'cal-010',
    start: '2026-06-19',
    title: 'Wellness Day',
  },
  {
    end: '2026-06-22T10:00:00.000Z',
    id: 'cal-011',
    start: '2026-06-22T09:00:00.000Z',
    title: 'Weekly Kickoff',
  },
  {
    end: '2026-06-22T17:00:00.000Z',
    id: 'cal-012',
    location: 'Room A',
    start: '2026-06-22T16:00:00.000Z',
    title: 'Roadmap Review',
  },
  {
    end: '2026-06-23T11:30:00.000Z',
    id: 'cal-013',
    start: '2026-06-23T11:00:00.000Z',
    title: 'Pairing Session',
  },
  {
    end: '2026-06-24T14:30:00.000Z',
    id: 'cal-014',
    location: 'Zoom',
    start: '2026-06-24T13:30:00.000Z',
    title: 'Vendor Demo',
  },
  {
    end: '2026-06-25T10:30:00.000Z',
    id: 'cal-015',
    start: '2026-06-25T10:00:00.000Z',
    title: 'Security Review',
  },
  {
    allDay: true,
    end: '2026-06-26',
    id: 'cal-016',
    start: '2026-06-25',
    title: 'Offsite',
  },
  {
    end: '2026-06-29T09:30:00.000Z',
    id: 'cal-017',
    start: '2026-06-29T09:00:00.000Z',
    title: 'Standup',
  },
  {
    end: '2026-06-30T16:00:00.000Z',
    id: 'cal-018',
    location: 'Room B',
    start: '2026-06-30T15:00:00.000Z',
    title: 'Quarter Close',
  },
  {
    end: '2026-07-01T12:00:00.000Z',
    id: 'cal-019',
    start: '2026-07-01T11:00:00.000Z',
    title: 'All Hands',
  },
  {
    description: 'Celebrate the release.',
    end: '2026-07-02T18:00:00.000Z',
    id: 'cal-020',
    location: 'Rooftop',
    start: '2026-07-02T17:00:00.000Z',
    title: 'Launch Party',
  },
  // --- Recurring series (rrule built via the package's buildRRule helper) ---
  {
    description: 'Weekly Monday standup. Skips the June 22 holiday week.',
    end: '2026-06-15T09:15:00.000Z',
    exdate: ['2026-06-22T09:00:00.000Z'],
    id: 'cal-021',
    location: 'Zoom',
    rrule: buildRRule({
      byDay: [RecurrenceWeekday.Monday],
      count: 8,
      frequency: RecurrenceFrequency.Weekly,
    }),
    start: '2026-06-15T09:00:00.000Z',
    title: 'Weekly Standup',
  },
  {
    description: 'Monthly business review on the 1st.',
    end: '2026-06-01T16:00:00.000Z',
    id: 'cal-022',
    location: 'Room A',
    rrule: buildRRule({
      byMonthDay: [1],
      count: 6,
      frequency: RecurrenceFrequency.Monthly,
    }),
    start: '2026-06-01T15:00:00.000Z',
    title: 'Monthly Review',
  },
  {
    description: 'Daily focus block through the end of June.',
    end: '2026-06-15T08:30:00.000Z',
    id: 'cal-023',
    rrule: buildRRule({
      frequency: RecurrenceFrequency.Daily,
      until: '20260630T000000Z',
    }),
    start: '2026-06-15T08:00:00.000Z',
    title: 'Focus Block',
  },
];
