import type { GlobalSidebarContentLinkProps } from '@openthrottle/react-router-ui-global';
import { describe, expect, test, vi } from 'vitest';
import {
  dataNavigationGuest,
  dataNavigationV2,
} from '~/global/data/data.navigation';
import type { NavigationRecord } from '../navigation-to-commander-groups';
import {
  buildCommanderGroupsFromNavigation,
  getCommanderIdFromPath,
} from '../navigation-to-commander-groups';

const buildOptions = (
  overrides: {
    readonly isBetaEnabled?: boolean;
    readonly isCharlieEnabled?: boolean;
  } = {},
) => ({
  isBetaEnabled: overrides.isBetaEnabled ?? false,
  isCharlieEnabled: overrides.isCharlieEnabled ?? false,
  navigate: vi.fn(),
});

/**
 * @description Mirrors the mapper's visibility rules so expectations are derived
 * from `data.navigation.ts` rather than a duplicated list of destination ids.
 */
const expectedLinks = (
  navigation: NavigationRecord,
  flags: {
    readonly isBetaEnabled: boolean;
    readonly isCharlieEnabled: boolean;
  },
): readonly GlobalSidebarContentLinkProps[] =>
  Object.values(navigation)
    .flat()
    .filter(
      (link) =>
        (link.beta !== true || flags.isBetaEnabled) &&
        (link.disabled !== true || flags.isCharlieEnabled),
    );

describe('getCommanderIdFromPath', () => {
  test('slugifies nested paths and special-cases the index route', () => {
    expect(getCommanderIdFromPath('/dashboard')).toBe('nav-dashboard');
    expect(getCommanderIdFromPath('/settings/agents')).toBe(
      'nav-settings-agents',
    );
    expect(getCommanderIdFromPath('/')).toBe('nav-home');
  });
});

describe('buildCommanderGroupsFromNavigation', () => {
  test('headings come from the navigation record, empty groups omitted', () => {
    const groups = buildCommanderGroupsFromNavigation(
      dataNavigationV2,
      buildOptions(),
    );

    const headings = groups.map((group) => group.heading);
    expect(headings).toEqual(
      Object.keys(dataNavigationV2).filter((section) =>
        dataNavigationV2[section]!.some(
          (link) => link.beta !== true && link.disabled !== true,
        ),
      ),
    );
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
  });

  test('omits beta and disabled links when both flags are off', () => {
    const flags = { isBetaEnabled: false, isCharlieEnabled: false };
    const groups = buildCommanderGroupsFromNavigation(dataNavigationV2, {
      ...flags,
      navigate: vi.fn(),
    });

    const labels = groups.flatMap((group) =>
      group.items.map((item) => item.label),
    );
    expect(labels).toEqual(
      expectedLinks(dataNavigationV2, flags).map((link) =>
        String(link.children),
      ),
    );
  });

  test('includes beta links when the beta flag is on', () => {
    const flags = { isBetaEnabled: true, isCharlieEnabled: false };
    const groups = buildCommanderGroupsFromNavigation(dataNavigationV2, {
      ...flags,
      navigate: vi.fn(),
    });

    const labels = groups.flatMap((group) =>
      group.items.map((item) => item.label),
    );
    expect(labels).toEqual(
      expectedLinks(dataNavigationV2, flags).map((link) =>
        String(link.children),
      ),
    );
    /** Beta-but-not-disabled entries only appear once the flag is on. */
    expect(labels.length).toBeGreaterThan(
      expectedLinks(dataNavigationV2, {
        isBetaEnabled: false,
        isCharlieEnabled: false,
      }).length,
    );
  });

  test('includes disabled links when the charlie flag is on', () => {
    const flags = { isBetaEnabled: true, isCharlieEnabled: true };
    const groups = buildCommanderGroupsFromNavigation(dataNavigationV2, {
      ...flags,
      navigate: vi.fn(),
    });

    const labels = groups.flatMap((group) =>
      group.items.map((item) => item.label),
    );
    expect(labels).toEqual(
      expectedLinks(dataNavigationV2, flags).map((link) =>
        String(link.children),
      ),
    );
  });

  test('ids and filter values derive from each link path', () => {
    const groups = buildCommanderGroupsFromNavigation(
      dataNavigationV2,
      buildOptions(),
    );

    const items = groups.flatMap((group) => group.items);
    const links = expectedLinks(dataNavigationV2, {
      isBetaEnabled: false,
      isCharlieEnabled: false,
    });

    items.forEach((item, index) => {
      const link = links[index]!;
      const path = String(link.to);

      expect(item.id).toBe(getCommanderIdFromPath(path));
      expect(item.value).toBe(`${String(link.children)} ${path}`);
      expect(item.icon).toBeDefined();
    });
  });

  test('onSelect navigates to the link path', () => {
    const options = buildOptions();
    const groups = buildCommanderGroupsFromNavigation(
      dataNavigationV2,
      options,
    );

    const dashboard = groups
      .flatMap((group) => group.items)
      .find((item) => item.id === 'nav-dashboard');

    expect(dashboard).toBeDefined();
    dashboard?.onSelect?.();

    expect(options.navigate).toHaveBeenCalledWith('/dashboard');
  });

  test('guest navigation maps its own sections', () => {
    const groups = buildCommanderGroupsFromNavigation(
      dataNavigationGuest,
      buildOptions(),
    );

    expect(groups.map((group) => group.heading)).toEqual(
      Object.keys(dataNavigationGuest),
    );
    expect(
      groups.flatMap((group) => group.items).map((item) => item.label),
    ).toEqual(
      expectedLinks(dataNavigationGuest, {
        isBetaEnabled: false,
        isCharlieEnabled: false,
      }).map((link) => String(link.children)),
    );
  });
});
