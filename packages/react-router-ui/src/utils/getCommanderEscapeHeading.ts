import type { CommanderGroup } from '../components/OpenThrottleCommander';
import { COMMANDER_ESCAPE_HEADING } from '../data/copy';
import { scoreCommanderRow } from './scoreCommanderRow';

export interface GetCommanderEscapeHeadingOptions {
  readonly groups: readonly CommanderGroup[];
  /** Whether the escape group holds any leading or fallback extras. */
  readonly hasExtras: boolean;
  /** Trimmed palette query. */
  readonly search: string;
}

/**
 * @description Heading for the palette's escape-hatch group. The group is
 * force-mounted for any non-empty query, so it only claims "No match" when no
 * static row in `groups` scores above zero — scored the way cmdk scores it,
 * against `value ?? id`. With a static match it takes a neutral heading.
 */
export const getCommanderEscapeHeading = (
  options: GetCommanderEscapeHeadingOptions,
): string => {
  const { groups, hasExtras, search } = options;

  const hasStaticMatch = groups.some((group) => {
    return group.items.some((item) => {
      return scoreCommanderRow(item.value ?? item.id, search, undefined) > 0;
    });
  });

  if (!hasExtras) {
    return COMMANDER_ESCAPE_HEADING.search;
  }
  if (hasStaticMatch) {
    return COMMANDER_ESCAPE_HEADING.more;
  }

  return COMMANDER_ESCAPE_HEADING.noMatch;
};
