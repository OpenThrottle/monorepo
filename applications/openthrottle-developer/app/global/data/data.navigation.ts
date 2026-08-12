import {
  GlobalSidebarContentLinkProps,
  GlobalSidebarLinkProps,
} from '@openthrottle/react-router-ui-global';
import {
  BellIcon,
  BinaryIcon,
  BlocksIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  BrainIcon,
  BugIcon,
  CalendarClockIcon,
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
  NotebookTextIcon,
  Search,
  StickyNoteIcon,
  SwatchBookIcon,
  TerminalSquareIcon,
  ToggleRightIcon,
  WandSparklesIcon,
  WrenchIcon,
} from 'lucide-react';

const linksLegal = [
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
];

/* eslint-disable sort-keys, sort-keys-fix/sort-keys-fix */
export const dataNavigationV2: Record<string, GlobalSidebarContentLinkProps[]> =
  {
    Agents: [
      {
        beta: true,
        children: 'Calendar',
        disabled: true, // 🔴
        icon: CalendarDaysIcon,
        to: '/calendar',
      },
      {
        children: 'Chats',
        disabled: false, // 🔴 🟠 🟡
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
        disabled: true, // 🔴
        icon: CodeIcon,
        to: '/ide',
      },
      {
        beta: true,
        children: 'Personas',
        disabled: true, // 🔴
        icon: BrainCircuitIcon,
        to: '/personas',
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
        children: 'Prompts',
        disabled: true, // 🔴
        icon: BrainIcon,
        to: '/prompts',
      },
      {
        beta: true,
        children: 'Pull Requests',
        disabled: true, // 🔴 🟠
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
        beta: false,
        children: 'Rules',
        disabled: false, // 🔴
        icon: WandSparklesIcon,
        to: '/rules',
      },
      {
        children: 'Schedule',
        disabled: false,
        icon: CalendarClockIcon,
        to: '/schedule',
      },
      {
        beta: false,
        children: 'Skills',
        disabled: false, // 🔴
        icon: BrainCircuitIcon,
        to: '/skills',
      },
      {
        beta: true,
        children: 'Search',
        disabled: true, // 🔴
        icon: Search,
        to: '/search',
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
        beta: true,
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
        beta: true,
        children: 'Debug',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: BugIcon,
        to: '/settings/debug',
      },
      {
        children: 'Keys',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: KeyRoundIcon,
        to: '/settings/keys',
      },
      {
        beta: true,
        children: 'Logs',
        disabled: false, // 🔴 🟠 🟡
        icon: TerminalSquareIcon,
        to: '/settings/logs',
      },
      {
        beta: true,
        children: 'MCP',
        disabled: true, // 🔴 🟠 🟡 🟢
        icon: BlocksIcon,
        to: '/settings/mcp',
      },
      {
        beta: true,
        children: 'Rollout',
        disabled: true, // 🔴
        icon: ToggleRightIcon,
        to: '/settings/rollout',
      },
      {
        beta: true,
        children: 'Setup',
        disabled: false, // 🔴 🟠 🟡 🟢
        icon: WrenchIcon,
        to: '/settings/setup',
      },
      {
        children: 'Workspace',
        disabled: false, // 🔴 🟠 🟡
        icon: MonitorCogIcon,
        to: '/settings/workspace',
      },
    ],
    Workspace: [
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
        children: 'Notes',
        disabled: false, // 🔴 🟠
        icon: StickyNoteIcon,
        to: '/notes',
      },
      {
        beta: true,
        children: 'Notifications',
        disabled: true, // 🔴 🟠 🟡 🟢
        icon: BellIcon,
        to: '/notifications',
      },
    ],
    Legal: linksLegal,
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
  Legal: linksLegal,
};

/* eslint-enable sort-keys, sort-keys-fix/sort-keys-fix */
