import { matchPath } from 'react-router';

import type { GlobalSidebarContentLinkProps } from '../components/GlobalSidebarContent';
import { getPathFromTo } from './utils.global';

/**
 * @description Whether a sidebar link matches the pathname. Prefix match by
 * default; exact when the link sets `end`.
 */
export function isSidebarLinkActive(
  item: GlobalSidebarContentLinkProps,
  pathname: string,
): boolean {
  const path = getPathFromTo(item.to);

  return matchPath({ end: item.end === true, path }, pathname) !== null;
}

/**
 * @description The first sub-link of a parent that matches the pathname.
 */
export function findActiveSubLink(
  item: GlobalSidebarContentLinkProps,
  pathname: string,
): GlobalSidebarContentLinkProps | undefined {
  return item.subLinks?.find((subLink) => {
    return isSidebarLinkActive(subLink, pathname);
  });
}

/**
 * @description Whether a link, or any of its sub-links, matches the pathname.
 */
export function hasActiveSidebarLink(
  item: GlobalSidebarContentLinkProps,
  pathname: string,
): boolean {
  return (
    isSidebarLinkActive(item, pathname) ||
    findActiveSubLink(item, pathname) !== undefined
  );
}
