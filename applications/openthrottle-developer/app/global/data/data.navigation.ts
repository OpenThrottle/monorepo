import { GlobalSidebarLinkProps } from '@openthrottle/react-router-ui-global';
import {
  BrainCircuitIcon,
  BrainIcon,
  BugIcon,
  FileChartColumn,
  FoldersIcon,
  GaugeIcon,
  ListChevronsUpDownIcon,
  ListOrderedIcon,
  NotebookTextIcon,
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
      children: 'Queues',
      icon: ListOrderedIcon,
      to: '/queues',
    },
    {
      children: 'Notes',
      icon: NotebookTextIcon,
      to: '/notes',
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
      children: 'General',
      icon: SettingsIcon,
      end: true,
      to: '/settings',
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
  ],
  User: [
    {
      children: 'Profile',
      icon: UserCircle,
      to: '/profile',
    },
  ],
};
/* eslint-enable sort-keys-fix/sort-keys-fix */
