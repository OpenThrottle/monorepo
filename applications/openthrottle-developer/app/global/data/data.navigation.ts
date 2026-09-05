import {
  GlobalSidebarContentLinkProps,
  GlobalSidebarLinkProps,
} from '@openthrottle/react-router-ui-global';
import { FEATURE_BETA_PREVIEW } from '@openthrottle/react-router-utils';
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
  FolderGit2Icon,
  FoldersIcon,
  GaugeIcon,
  GitPullRequest,
  HatGlassesIcon,
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

/* eslint-disable sort-keys, sort-keys-fix/sort-keys-fix */
export const dataNavigationV2: Record<string, GlobalSidebarContentLinkProps[]> =
  {
    Agents: [
      {
        children: 'Chats',
        end: true,
        icon: MessageCircleCode,
        to: '/',
      },
      {
        children: 'Dashboard',
        icon: GaugeIcon,
        to: '/dashboard',
      },
      {
        children: 'Plans',
        icon: NotebookTextIcon,
        end: false,
        to: '/plans',
      },
      {
        beta: true,
        children: 'Projects',
        icon: FoldersIcon,
        to: '/projects',
      },
      {
        beta: true,
        children: 'Prompts',
        icon: BrainIcon,
        to: '/prompts',
      },
      {
        children: 'Queues',
        icon: ListOrderedIcon,
        to: '/queues',
      },
      {
        children: 'Rules',
        icon: WandSparklesIcon,
        to: '/rules',
      },
      {
        children: 'Schedule',
        icon: CalendarClockIcon,
        to: '/schedule',
      },
      {
        children: 'Skills',
        icon: BrainCircuitIcon,
        to: '/skills',
      },
      {
        children: 'Usage',
        icon: ChartAreaIcon,
        to: '/usage',
      },
    ],

    ...(FEATURE_BETA_PREVIEW
      ? {
          Beta: [
            {
              beta: true,
              children: 'Application',
              icon: BinaryIcon,
              to: '/settings/application',
            },
            {
              beta: true,
              children: 'Calendar',
              icon: CalendarDaysIcon,
              to: '/calendar',
            },
            {
              beta: true,
              children: 'Debug',
              icon: BugIcon,
              to: '/settings/debug',
            },
            {
              beta: true,
              children: 'Generators',
              icon: WrenchIcon,
              to: '/generators',
            },
            {
              beta: true,
              children: 'IDE',
              icon: CodeIcon,
              to: '/ide',
            },
            {
              beta: true,
              children: 'Logs',
              icon: TerminalSquareIcon,
              to: '/settings/logs',
            },
            {
              beta: true,
              children: 'MCP',
              icon: BlocksIcon,
              to: '/settings/mcp',
            },
            {
              beta: true,
              children: 'Notifications',
              disabled: false,
              icon: BellIcon,
              to: '/notifications',
            },
            {
              beta: true,
              children: 'Personas',
              icon: BrainCircuitIcon,
              to: '/personas',
            },
            {
              beta: true,
              children: 'Pull Requests',
              icon: GitPullRequest,
              to: '/pull-requests',
            },
            {
              beta: true,
              children: 'Rollout',
              icon: ToggleRightIcon,
              to: '/settings/rollout',
            },
            {
              beta: true,
              children: 'Search',
              icon: Search,
              to: '/search',
            },
          ],
        }
      : {}),

    Settings: [
      {
        children: 'Agents',
        icon: HatGlassesIcon,
        to: '/settings/agents',
      },
      {
        children: 'Appearance',
        icon: SwatchBookIcon,
        to: '/settings/appearance',
      },
      {
        children: 'Keys',
        disabled: false,
        icon: KeyRoundIcon,
        to: '/settings/keys',
      },
      {
        children: 'Repositories',
        disabled: false,
        icon: FolderGit2Icon,
        to: '/settings/repositories',
      },
      {
        children: 'Workspace',
        disabled: false,
        icon: MonitorCogIcon,
        to: '/settings/workspace',
      },
    ],
    Workspace: [
      {
        children: 'Documentation',
        icon: BookOpenIcon,
        to: '/docs',
      },
      {
        children: 'FAQ',
        icon: CircleHelpIcon,
        to: '/faq',
      },
      {
        children: 'Notes',
        icon: StickyNoteIcon,
        to: '/notes',
      },
    ],
  };

export const dataNavigationGuest: Record<string, GlobalSidebarLinkProps[]> = {
  Workspace: [
    {
      children: 'Login',
      icon: LogInIcon,
      to: '/auth',
    },
  ],
  Legal: [
    {
      children: 'License',
      icon: BookOpenIcon,
      to: '/legal/license',
    },
    {
      children: 'Privacy policy',
      icon: BookOpenIcon,
      to: '/legal/privacy-policy',
    },
    {
      children: 'Terms of use',
      icon: BookOpenIcon,
      to: '/legal/terms-of-use',
    },
  ],
};

/* eslint-enable sort-keys, sort-keys-fix/sort-keys-fix */
