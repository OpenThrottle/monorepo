import { GlobalSidebarLinkProps } from '@openthrottle/react-router-ui-global';
import {
  BellIcon,
  BrainCircuitIcon,
  BrainIcon,
  BugIcon,
  FileChartColumn,
  FoldersIcon,
  GaugeIcon,
  GitPullRequest,
  ListChevronsUpDownIcon,
  ListOrderedIcon,
  NotebookTextIcon,
  Search,
  SettingsIcon,
  SwatchBookIcon,
  TerminalSquareIcon,
  UserCircle,
} from 'lucide-react';

/* eslint-disable sort-keys-fix/sort-keys-fix */
export const dataNavigationV2: Record<string, GlobalSidebarLinkProps[]> = {
  Workspace: [
    {
      children: 'Dashboard',
      icon: GaugeIcon,
      to: '/dashboard',
    },
    {
      children: 'Search',
      icon: Search,
      to: '/search',
    },
    {
      children: 'Plans',
      icon: ListChevronsUpDownIcon,
      to: '/plans',
    },
    {
      children: 'Projects',
      icon: FoldersIcon,
      to: '/projects',
    },
    {
      children: 'Pull requests',
      icon: GitPullRequest,
      to: '/pull-requests',
    },
    {
      children: 'Queues',
      icon: ListOrderedIcon,
      to: '/queues',
    },
  ],
  Agents: [
    {
      children: 'Prompts',
      icon: BrainIcon,
      to: '/prompts',
    },
    {
      children: 'Skills',
      icon: BrainCircuitIcon,
      to: '/skills',
    },
    {
      children: 'Usage',
      icon: FileChartColumn,
      to: '/usage',
    },
  ],
  Settings: [
    {
      children: 'Appearance',
      icon: SwatchBookIcon,
      to: '/settings/appearance',
    },
    {
      children: 'Debug',
      icon: BugIcon,
      to: '/settings/debug',
    },
    {
      children: 'General',
      icon: SettingsIcon,
      end: true,
      to: '/settings',
    },
    {
      children: 'Logs',
      icon: TerminalSquareIcon,
      to: '/settings/logs',
    },
  ],
  User: [
    {
      children: 'Notes',
      icon: NotebookTextIcon,
      to: '/notes',
    },
    {
      children: 'Notifications',
      icon: BellIcon,
      to: '/notifications',
    },
    {
      children: 'Profile',
      icon: UserCircle,
      to: '/profile',
    },
  ],
};
/* eslint-enable sort-keys-fix/sort-keys-fix */
