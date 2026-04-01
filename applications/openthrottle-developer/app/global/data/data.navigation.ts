import { LinkProps } from 'react-router';

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
