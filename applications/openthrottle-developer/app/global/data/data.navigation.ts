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
    children: 'Plans',
    to: '/plans',
  },
  {
    children: 'Projects',
    to: '/projects',
  },
  {
    children: 'Prompts',
    to: '/prompts',
  },
  {
    children: 'Settings',
    to: '/settings',
  },
  // {
  //   children: 'Notes',
  //   to: '/notes',
  // },
  // {
  //   children: 'PRs',
  //   to: '/pull-requests',
  // },
  // {
  //   children: 'Queues',
  //   to: '/queues',
  // },
  // {
  //   children: 'Generators',
  //   to: '/generators',
  // },
];
