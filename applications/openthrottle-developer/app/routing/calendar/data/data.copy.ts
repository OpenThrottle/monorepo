/**
 * @description Single-sourced user-facing copy for the calendar routing area. The
 * components render these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const CALENDAR_INTRO_COPY = {
  description: 'Events across your projects and team.',
  title: 'Calendar',
} as const;

export const CALENDAR_EMPTY_COPY = {
  cta: 'Create event',
  description: 'Create your first event to get started.',
  searchCta: 'Clear search',
  searchDescription: 'Try clearing the search to see all events.',
  searchTitle: 'No events match your search',
  title: 'No events yet',
} as const;

export const CALENDAR_NOT_FOUND_COPY = {
  description: `The event you're looking for doesn't exist or was removed.`,
  title: 'Event not found',
} as const;
