import type { BadgeProps } from '@openthrottle/react-router-shadcn';

import type { SearchSource } from '~/routing/search/utils/normalizeSource';

/** Pill color per result source, so every card uses the same mapping. */
export const SEARCH_SOURCE_PILL_COLORS: Readonly<
  Record<SearchSource, NonNullable<BadgeProps['color']>>
> = {
  documentation: 'violet',
  plan: 'green',
  task: 'blue',
};
