import { GlobalSidebarLinkProps } from '@openthrottle/react-router-ui-global';
import {
  BrainCircuitIcon,
  BrainIcon,
  BugIcon,
  FileChartColumn,
  GaugeIcon,
  ListIcon,
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
      icon: NotebookTextIcon,
      end: true,
      to: '/plans',
    },
    {
      children: 'Projects',
      icon: ListIcon,
      end: true,
      to: '/projects',
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
      children: 'Settings',
      icon: SettingsIcon,
      to: '/settings',
    },
    {
      children: 'Customization',
      icon: SettingsIcon,
      to: '/settings/customization',
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
      to: '/settings/',
    },
  ],
};
/* eslint-enable sort-keys-fix/sort-keys-fix */
