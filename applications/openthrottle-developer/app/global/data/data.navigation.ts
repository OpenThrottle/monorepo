import { GlobalSidebarLinkProps } from '@openthrottle/react-router-ui-global';
import { IS_DEVELOPMENT } from '@openthrottle/react-router-utils';
import {
  BellIcon,
  BinaryIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  BrainIcon,
  BugIcon,
  CodeIcon,
  FileChartColumn,
  FoldersIcon,
  GaugeIcon,
  GitPullRequest,
  KeyRoundIcon,
  ListOrderedIcon,
  LogInIcon,
  MonitorCogIcon,
  NotebookTabsIcon,
  NotebookTextIcon,
  Search,
  SwatchBookIcon,
  TerminalSquareIcon,
  UserCircleIcon,
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
      children: 'IDE',
      icon: CodeIcon,
      to: '/ide',
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
      children: 'Personas',
      icon: BrainCircuitIcon,
      to: '/personas',
    },
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
      children: 'Keys',
      icon: KeyRoundIcon,
      to: '/settings/keys',
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
  ...(IS_DEVELOPMENT
    ? {
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
            icon: UserCircleIcon,
            to: '/profile',
          },
        ],
      }
    : {}),

  Legal: [
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

export const dataNavigationGuest: Record<string, GlobalSidebarLinkProps[]> = {
  Workspace: [
    {
      children: 'About',
      end: true,
      icon: BookOpenIcon,
      to: '/about',
    },
    {
      children: 'Login',
      icon: LogInIcon,
      to: '/auth',
    },
  ],
  Legal: [
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
