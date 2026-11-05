import { CALENDAR_EMPTY_COPY } from '~/routing/calendar/data/data.copy';

/** Empty-state copy and call to action, keyed by whether a search is active. */
export const CALENDAR_EMPTY_VARIANTS = {
  default: {
    cta: CALENDAR_EMPTY_COPY.cta,
    ctaHref: '/calendar/create',
    description: CALENDAR_EMPTY_COPY.description,
    title: CALENDAR_EMPTY_COPY.title,
  },
  search: {
    cta: CALENDAR_EMPTY_COPY.searchCta,
    ctaHref: '/calendar/list',
    description: CALENDAR_EMPTY_COPY.searchDescription,
    title: CALENDAR_EMPTY_COPY.searchTitle,
  },
} as const;
