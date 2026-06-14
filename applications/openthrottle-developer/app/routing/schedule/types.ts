/**
 * @description Shared types for the schedule routing area. Schedule data is
 * stubbed in `data/data.events.ts` until a GraphQL source exists; swap these for
 * generated fragment types when the backend lands (plan 26594427).
 */

export interface ScheduleEvent {
  allDay: boolean;
  description: string;
  endsAt: string;
  id: string;
  location: string;
  startsAt: string;
  title: string;
}
