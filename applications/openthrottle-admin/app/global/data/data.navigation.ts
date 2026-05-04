import { LinkProps } from 'react-router';

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
