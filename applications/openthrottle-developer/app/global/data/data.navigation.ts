import {
  GlobalSidebarContentLinkProps,
  GlobalSidebarLinkProps,
} from '@openthrottle/react-router-ui-global';
import { IS_DEVELOPMENT } from '@openthrottle/react-router-utils';
import {
  BellIcon,
  BinaryIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  BrainIcon,
  BugIcon,
  CalendarDaysIcon,
  ChartAreaIcon,
  CircleHelpIcon,
  // CodeIcon,
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
export const dataNavigationV2: Record<string, GlobalSidebarContentLinkProps[]> =
  {
    Workspace: [
      {
        children: 'Dashboard',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: GaugeIcon,
        to: '/dashboard',
      },
      // {
      //   children: 'IDE',
      //   disabled: true, // 🔴
      //   icon: CodeIcon,
      //   to: '/ide',
      // },
      {
        children: 'Plans',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: NotebookTextIcon,
        to: '/plans',
      },
      {
        children: 'Projects',
        disabled: false, // 🔴 🟠 🟡
        icon: FoldersIcon,
        to: '/projects',
      },
      {
        children: 'Pull Requests',
        disabled: false, // 🔴 🟠
        icon: GitPullRequest,
        to: '/pull-requests',
      },
      {
        disabled: false, // 🔴 🟠 🟡
        children: 'Queues',
        icon: ListOrderedIcon,
        to: '/queues',
      },
      ...(IS_DEVELOPMENT
        ? [
            {
              children: 'Schedule',
              disabled: false, // 🔴
              icon: CalendarDaysIcon,
              to: '/schedule',
            },
            {
              children: 'Search',
              disabled: false, // 🔴
              icon: Search,
              to: '/search',
            },
          ]
        : []),
    ],
    Agents: [
      {
        children: 'Personas',
        disabled: false, // 🔴
        icon: BrainCircuitIcon,
        to: '/personas',
      },
      {
        children: 'Prompts',
        disabled: false, // 🔴
        icon: BrainIcon,
        to: '/prompts',
      },
      {
        children: 'Skills',
        disabled: false, // 🔴
        icon: BrainCircuitIcon,
        to: '/skills',
      },
      {
        children: 'Usage',
        disabled: false, // 🔴 🟠
        icon: ChartAreaIcon,
        to: '/usage',
      },
    ],
    Settings: [
      {
        children: 'Application',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: BinaryIcon,
        to: '/settings/application',
      },
      {
        children: 'Appearance',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: SwatchBookIcon,
        to: '/settings/appearance',
      },
      {
        children: 'Debug',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: BugIcon,
        to: '/settings/debug',
      },
      {
        children: 'Documentation',
        disabled: false, // 🔴 🟠
        icon: BookOpenIcon,
        to: '/docs',
      },
      {
        children: 'FAQ',
        disabled: false, // 🔴 🟠
        icon: CircleHelpIcon,
        to: '/faq',
      },
      {
        children: 'Keys',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: KeyRoundIcon,
        to: '/settings/keys',
      },
      {
        children: 'Logs',
        disabled: false, // 🔴 🟠 🟡
        icon: TerminalSquareIcon,
        to: '/settings/logs',
      },
      {
        children: 'Workspace',
        disabled: false, // 🔴 🟠 🟡
        icon: MonitorCogIcon,
        to: '/settings/workspace',
      },
    ],
    ...(IS_DEVELOPMENT
      ? {
          User: [
            {
              children: 'Notes',
              disabled: false, // 🔴 🟠
              icon: NotebookTextIcon,
              to: '/notes',
            },
            {
              children: 'Notifications',
              disabled: false, // 🔴 🟠 🟡 🟢
              icon: BellIcon,
              to: '/notifications',
            },
            {
              children: 'Profile',
              disabled: false, // 🔴 🟠 🟡 🟢
              icon: UserCircleIcon,
              to: '/profile',
            },
          ],
        }
      : {}),

    Legal: [
      {
        children: 'License',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: NotebookTabsIcon,
        to: '/legal/license',
      },
      {
        children: 'Privacy Policy',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: NotebookTabsIcon,
        to: '/legal/privacy-policy',
      },
      {
        children: 'Terms of Use',
        disabled: false, // 🔴 🟠 🟡 🟢
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
