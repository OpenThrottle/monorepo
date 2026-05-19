import { GlobalSidebarLinkProps } from '@openthrottle/react-router-ui-global';
import {
  BellIcon,
  BinaryIcon,
  BrainCircuitIcon,
  BrainIcon,
  BugIcon,
  FileChartColumn,
  FoldersIcon,
  GaugeIcon,
  GitPullRequest,
  ListOrderedIcon,
  NotebookTextIcon,
  NotebookTabsIcon,
  Search,
  SwatchBookIcon,
  TerminalSquareIcon,
  MonitorCogIcon,
} from 'lucide-react';

/* eslint-disable sort-keys, sort-keys-fix/sort-keys-fix */
export const dataNavigationV2: Record<string, GlobalSidebarLinkProps[]> = {
  Workspace: [
    {
      children: 'Dashboard',
      icon: GaugeIcon,
      to: '/dashboard',
    },
    {
      children: 'Plans',
      icon: NotebookTextIcon,
      to: '/plans',
    },
    {
      children: 'Projects',
      icon: FoldersIcon,
      to: '/projects',
    },
    {
      children: 'Pull Requests',
      icon: GitPullRequest,
      to: '/pull-requests',
    },
    {
      children: 'Queues',
      icon: ListOrderedIcon,
      to: '/queues',
    },
    {
      children: 'Search',
      icon: Search,
      to: '/search',
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
      children: 'Application',
      icon: BinaryIcon,
      to: '/settings/application',
    },
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
      children: 'Logs',
      icon: TerminalSquareIcon,
      to: '/settings/logs',
    },
    {
      children: 'Workspace',
      icon: MonitorCogIcon,
      to: '/settings/workspace',
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
    // {
    //   children: 'Profile',
    //   icon: UserCircle,
    //   to: '/profile',
    // },
  ],
  Legal: [
    {
      children: 'About',
      end: true,
      icon: NotebookTabsIcon,
      to: '/legal',
    },
    {
      children: 'License',
      icon: NotebookTabsIcon,
      to: '/legal/license',
    },
    {
      children: 'Privacy Policy',
      icon: NotebookTabsIcon,
      to: '/legal/privacy-policy',
    },
    {
      children: 'Terms of Use',
      icon: NotebookTabsIcon,
      to: '/legal/terms-of-use',
    },
  ],
};
/* eslint-enable sort-keys, sort-keys-fix/sort-keys-fix */
