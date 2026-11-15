import { describe, expect, test } from 'vitest';

import type { GlobalSidebarContentLinkProps } from '../../components/GlobalSidebarContent';
import {
  findActiveSubLink,
  hasActiveSidebarLink,
  isSidebarLinkActive,
} from '../sidebar-links';

const icon = () => {
  return null;
};

const link: GlobalSidebarContentLinkProps = {
  children: 'Usage',
  icon,
  subLinks: [
    { children: 'Overview', end: true, icon, to: '/usage' },
    { children: 'Skills', icon, to: '/usage/skills' },
  ],
  to: '/usage',
};

describe('isSidebarLinkActive', () => {
  test('prefix matches by default', () => {
    expect(isSidebarLinkActive(link, '/usage/skills')).toBe(true);
    expect(isSidebarLinkActive(link, '/plans')).toBe(false);
  });

  test('requires an exact match when end is set', () => {
    const [overview] = link.subLinks ?? [];

    expect(overview).toBeDefined();
    expect(isSidebarLinkActive({ ...link, end: true }, '/usage/skills')).toBe(
      false,
    );
    expect(isSidebarLinkActive({ ...link, end: true }, '/usage')).toBe(true);
  });
});

describe('findActiveSubLink', () => {
  test('returns the matching sub-link only', () => {
    expect(findActiveSubLink(link, '/usage/skills')?.children).toBe('Skills');
    expect(findActiveSubLink(link, '/usage')?.children).toBe('Overview');
    expect(findActiveSubLink(link, '/plans')).toBeUndefined();
  });
});

describe('hasActiveSidebarLink', () => {
  test('considers sub-links', () => {
    const parentOnlyOnExact: GlobalSidebarContentLinkProps = {
      ...link,
      end: true,
      to: '/elsewhere',
    };

    expect(hasActiveSidebarLink(parentOnlyOnExact, '/usage/skills')).toBe(true);
    expect(hasActiveSidebarLink(parentOnlyOnExact, '/plans')).toBe(false);
  });
});
