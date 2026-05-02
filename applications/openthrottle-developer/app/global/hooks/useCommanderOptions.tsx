import type { CommanderGroup } from '@openthrottle/react-router-ui';
import { useCallback } from 'react';
import {
  FolderIcon,
  FolderPlusIcon,
  HomeIcon,
  MapIcon,
  PlusCircleIcon,
  SettingsIcon,
  SpeechIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';

/**
 * @description Returns commander groups for the developer app: Navigation (Dashboard, Plans, Projects, Prompts, Queues, Notes, Generators, Settings) and optional Actions. Items use onSelect with useNavigate for React Router.
 */
export function useCommanderOptions(): CommanderGroup[] {
  // Hooks
  const navigate = useNavigate();

  // Setup

  // Handlers
  const nav = useCallback(
    (path: string) => () => {
      navigate(path);
    },

    [navigate],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  const groups: CommanderGroup[] = [
    {
      heading: 'Navigation',
      items: [
        {
          icon: <HomeIcon className="w-3! h-3!" />,
          id: 'nav-dashboard',
          label: 'Dashboard',
          onSelect: nav('/dashboard'),
          // shortcut: '⌘D',
        },
        {
          icon: <MapIcon className="w-3! h-3!" />,
          id: 'nav-plans',
          label: 'Plans',
          onSelect: nav('/plans'),
          // shortcut: '⌘P',
        },
        {
          icon: <FolderIcon className="w-3! h-3!" />,
          id: 'nav-projects',
          label: 'Projects',
          onSelect: nav('/projects'),
        },
        {
          icon: <SpeechIcon className="w-3! h-3!" />,
          id: 'nav-prompts',
          label: 'Prompts',
          onSelect: nav('/prompts'),
        },
        // {
        //   icon: <ChartLineIcon className="w-3! h-3!" />,
        //   id: 'nav-queues',
        //   label: 'Queues',
        //   onSelect: nav('/queues'),
        // },
        // {
        //   icon: <NotebookIcon className="w-3! h-3!" />,
        //   id: 'nav-notes',
        //   label: 'Notes',
        //   onSelect: nav('/notes'),
        // },
        // {
        //   icon: <BotIcon className="w-3! h-3!" />,
        //   id: 'nav-generators',
        //   label: 'Generators',
        //   onSelect: nav('/generators'),
        // },
        {
          icon: <SettingsIcon className="w-3! h-3!" />,
          id: 'nav-settings',
          label: 'Settings',
          onSelect: nav('/settings'),
        },
      ],
    },
    {
      heading: 'Actions',
      items: [
        {
          icon: <PlusCircleIcon className="w-3! h-3!" />,
          id: 'action-plan-create',
          label: 'Create plan',
          onSelect: nav('/plans/create'),
        },
        {
          icon: <FolderPlusIcon className="w-3! h-3!" />,
          id: 'action-project-create',
          label: 'Create project',
          onSelect: nav('/projects/create'),
        },
        // {
        //   icon: <ChartLineIcon className="w-3! h-3!" />,
        //   id: 'action-queue-create',
        //   label: 'Create queue',
        //   onSelect: nav('/queues/create'),
        // },
        // {
        //   id: 'action-note-create',
        //   label: 'Create note',
        //   onSelect: nav('/notes/create'),
        // },
        // {
        //   id: 'action-generator-create',
        //   label: 'Create generator',
        //   onSelect: nav('/generators/create'),
        // },
      ],
    },
    // {
    //   heading: 'Filters',
    //   items: [
    //     {
    //       id: 'filter-pull-requests',
    //       label: 'Pull requests',
    //       onSelect: nav('/pull-requests'),
    //     },
    //     {
    //       id: 'filter-plans',
    //       label: 'Create plan',
    //       onSelect: nav('/plans'),
    //     },
    //   ],
    // },
  ];

  return groups;
}
