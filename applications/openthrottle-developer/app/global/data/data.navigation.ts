import {
  GlobalSidebarContentLinkProps,
  GlobalSidebarLinkProps,
} from '@openthrottle/react-router-ui-global';
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
  CodeIcon,
  FoldersIcon,
  GaugeIcon,
  GitPullRequest,
  KeyRoundIcon,
  ListOrderedIcon,
  LogInIcon,
  MessageCircleCode,
  MonitorCogIcon,
  NotebookTabsIcon,
  NotebookTextIcon,
  Search,
  StickyNoteIcon,
  SwatchBookIcon,
  TerminalSquareIcon,
  UserCircleIcon,
} from 'lucide-react';

/* eslint-disable sort-keys, sort-keys-fix/sort-keys-fix */
export const dataNavigationV2: Record<string, GlobalSidebarContentLinkProps[]> =
  {
    Workspace: [
      {
        children: 'Chats',
        disabled: false, // 🔴 🟠 🟡 🟢
        end: true,
        icon: MessageCircleCode,
        to: '/',
      },
      {
        children: 'Dashboard',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: GaugeIcon,
        to: '/dashboard',
      },
      {
        beta: true,
        children: 'IDE',
        disabled: false, // 🔴
        icon: CodeIcon,
        to: '/ide',
      },
      {
        children: 'Plans',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: NotebookTextIcon,
        end: false,
        to: '/plans',
      },
      {
        children: 'Projects',
        disabled: false, // 🔴 🟠 🟡
        icon: FoldersIcon,
        to: '/projects',
      },
      {
        beta: true,
        children: 'Pull Requests',
        disabled: false, // 🔴 🟠
        icon: GitPullRequest,
        to: '/pull-requests',
      },
      {
        children: 'Queues',
        disabled: false, // 🔴 🟠 🟡
        icon: ListOrderedIcon,
        to: '/queues',
      },
      {
        beta: true,
        children: 'Schedule',
        disabled: false, // 🔴
        icon: CalendarDaysIcon,
        to: '/schedule',
      },
      {
        beta: true,
        children: 'Search',
        disabled: false, // 🔴
        icon: Search,
        to: '/search',
      },
    ],
    Agents: [
      {
        beta: true,
        children: 'Personas',
        disabled: false, // 🔴
        icon: BrainCircuitIcon,
        to: '/personas',
      },
      {
        beta: true,
        children: 'Prompts',
        disabled: false, // 🔴
        icon: BrainIcon,
        to: '/prompts',
      },
      {
        beta: true,
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
    Organization: [
      {
        children: 'Chats',
        disabled: false, // 🔴 🟠 🟡 🟢
        end: true,
        icon: MessageCircleCode,
        to: '/',
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
    User: [
      {
        children: 'Notes',
        disabled: false, // 🔴 🟠
        icon: StickyNoteIcon,
        to: '/notes',
      },
      {
        beta: true,
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
    Legal: [
      {
        children: 'License',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: BookOpenIcon,
        to: '/legal/license',
      },
      {
        children: 'Privacy policy',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: BookOpenIcon,
        to: '/legal/privacy-policy',
      },
      {
        children: 'Terms of use',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: BookOpenIcon,
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
      children: 'Privacy policy',
      icon: NotebookTabsIcon,
      to: '/legal/privacy-policy',
    },
    {
      children: 'Terms of use',
      icon: NotebookTabsIcon,
      to: '/legal/terms-of-use',
    },
  ],
};

/* eslint-enable sort-keys, sort-keys-fix/sort-keys-fix */
