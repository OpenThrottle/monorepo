import * as React from 'react';
import type {
  CommanderGroup,
  CommanderItem,
} from '@openthrottle/react-router-ui';
import type { GlobalSidebarContentLinkProps } from '@openthrottle/react-router-ui-global';
import type { LinkProps } from 'react-router';

const ICON_SM = 'h-3! w-3!';

/**
 * @description Navigation record shape shared by `GlobalLayout` and the palette
 * — the same `dataNavigationV2` / `dataNavigationGuest` exports from
 * `~/global/data/data.navigation`.
 */
export type NavigationRecord = Record<
  string,
  readonly GlobalSidebarContentLinkProps[]
>;

/**
 * @description Visibility flags + navigation callback the mapper needs. Flags
 * mirror `GlobalSidebarContent` (`FEATURE_BETA_PREVIEW`, `FEATURE_CHARLIE_PREVIEW`)
 * and are passed in so this util stays pure and unit-testable.
 */
export interface NavigationCommanderOptions {
  /**
   * @description When false, `beta` links are omitted — the palette equivalent of
   * the sidebar hiding them entirely.
   */
  readonly isBetaEnabled: boolean;
  /**
   * @description When false, `disabled` links are omitted. cmdk has no good
   * "visible but unclickable" row, so omission stands in for the sidebar's
   * `pointer-events-none` treatment.
   */
  readonly isCharlieEnabled: boolean;
  /**
   * @description Navigates to a link's path (in the app, `useNavigate()`).
   */
  readonly navigate: (path: string) => void;
}

/**
 * @description Normalizes a `NavLink` `to` into a plain pathname string.
 */
const getPathFromTo = (to: LinkProps['to']): string =>
  typeof to === 'string' ? to : (to.pathname ?? '/');

/**
 * @description Stable commander id from a path: `/settings/agents` →
 * `nav-settings-agents`. The index route (`/`, Chats) has no slug, so it is
 * special-cased to `nav-home` rather than a bare `nav-`.
 */
export const getCommanderIdFromPath = (path: string): string => {
  const slug = path
    .split('?')[0]!
    .split('#')[0]!
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();

  return slug.length === 0 ? 'nav-home' : `nav-${slug}`;
};

/**
 * @description True when a navigation link should appear in the palette, using
 * the same beta/disabled rules the sidebar applies.
 */
const isLinkVisible = (
  link: GlobalSidebarContentLinkProps,
  options: NavigationCommanderOptions,
): boolean => {
  if (link.beta === true && !options.isBetaEnabled) {
    return false;
  }

  if (link.disabled === true && !options.isCharlieEnabled) {
    return false;
  }

  return true;
};

/**
 * @description Maps one navigation link to a commander row.
 */
const toCommanderItem = (
  link: GlobalSidebarContentLinkProps,
  options: NavigationCommanderOptions,
): CommanderItem => {
  const { children, icon: IconComponent, to } = link;

  const path = getPathFromTo(to);
  const label = String(children ?? path);

  return {
    icon: <IconComponent className={ICON_SM} />,
    id: getCommanderIdFromPath(path),
    label,
    onSelect: () => {
      options.navigate(path);
    },
    /** Include label + path so cmdk matches "plans" and "/plans", not only the id. */
    value: `${label} ${path}`,
  };
};

/**
 * @description Derives commander groups from the navigation record that already
 * drives the global sidebar, so adding a link in `data.navigation.ts` is enough
 * for both surfaces. Section keys become group headings (Agents / Settings /
 * Workspace / Legal); groups left empty after beta/disabled filtering are omitted.
 */
export const buildCommanderGroupsFromNavigation = (
  navigation: NavigationRecord,
  options: NavigationCommanderOptions,
): CommanderGroup[] =>
  Object.entries(navigation).reduce<CommanderGroup[]>(
    (groups, [heading, links]) => {
      const items = links
        .filter((link) => isLinkVisible(link, options))
        .map((link) => toCommanderItem(link, options));

      if (items.length === 0) {
        return groups;
      }

      return [...groups, { heading, items }];
    },
    [],
  );
