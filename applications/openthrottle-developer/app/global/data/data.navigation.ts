import { GlobalSidebarLinkProps } from '@openthrottle/react-router-ui-global';
import {
  ChevronUp,
  GaugeIcon,
  ListIcon,
  NotebookTextIcon,
  Plane,
  PlusIcon,
  Projector,
  Settings,
  SettingsIcon,
  Speech,
  SquareTerminalIcon,
} from 'lucide-react';

/* eslint-disable sort-keys-fix/sort-keys-fix */
export const dataNavigationV2: Record<string, GlobalSidebarLinkProps[]> = {
  Dashboard: [
    {
      children: 'Dashboard',
      icon: GaugeIcon,
      to: '/dashboard',
    },
  ],
  Plans: [
    {
      children: 'All Plans',
      icon: NotebookTextIcon,
      end: true,
      to: '/plans',
    },
    {
      children: 'Create Plan',
      icon: PlusIcon,
      to: '/plans/create',
    },
  ],
  Projects: [
    {
      children: 'All Projects',
      icon: ListIcon,
      end: true,
      to: '/projects',
    },
    {
      children: 'Create Project',
      icon: PlusIcon,
      to: '/projects/create',
    },
  ],
  Prompts: [
    {
      children: 'Prompts',
      icon: SquareTerminalIcon,
      to: '/prompts',
    },
  ],
  Settings: [
    {
      children: 'Settings',
      icon: SettingsIcon,
      to: '/settings',
    },
  ],
};
/* eslint-enable sort-keys-fix/sort-keys-fix */

export const dataNavigation: GlobalSidebarLinkProps[] = [
  {
    children: 'Dashboard',
    icon: ChevronUp,
    to: '/dashboard',
  },
  {
    children: 'Plans',
    icon: Plane,
    to: '/plans',
  },
  {
    children: 'Projects',
    icon: Projector,
    to: '/projects',
  },
  {
    children: 'Prompts',
    icon: Speech,
    to: '/prompts',
  },
  {
    children: 'Settings',
    icon: Settings,
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
