import { LinkProps } from 'react-router';

/** Base path for all mail routes. Use for links and active-state checks. */
export const ADMIN_BASE_PATH = '/';

/** Canonical paths for admin areas. Use these for Link `to` and comparisons. */
export const ADMIN_PATHS = {
  dashboard: `/dashboard`,
  home: `/`,
  permissions: `/permissions`,
  roles: `/roles`,
  users: `/users`,
} as const;

export const dataNavigation: LinkProps[] = [
  {
    children: 'Dashboard',
    to: '/dashboard',
  },
  {
    children: 'Permissions',
    to: '/permissions',
  },
  {
    children: 'Roles',
    to: '/roles',
  },
  {
    children: 'Users',
    to: '/users',
  },
];
