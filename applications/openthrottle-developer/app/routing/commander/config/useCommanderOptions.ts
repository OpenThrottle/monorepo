import type { CommanderGroup } from '@openthrottle/react-router-ui';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';

/**
 * @description Returns commander groups for the developer app: Navigation (Dashboard, Plans, Projects, Queues, Notes, Generators) and optional Actions. Items use onSelect with useNavigate for React Router.
 */
export function useCommanderOptions(): CommanderGroup[] {
  const navigate = useNavigate();

  const nav = useCallback(
    (path: string) => () => {
      navigate(path);
    },
    [navigate],
  );

  const groups: CommanderGroup[] = [
    {
      heading: 'Navigation',
      items: [
        {
          id: 'nav-dashboard',
          label: 'Dashboard',
          onSelect: nav('/dashboard'),
          shortcut: '⌘D',
        },
        {
          id: 'nav-plans',
          label: 'Plans',
          onSelect: nav('/plans'),
          shortcut: '⌘P',
        },
        { id: 'nav-projects', label: 'Projects', onSelect: nav('/projects') },
        { id: 'nav-prompts', label: 'Prompts', onSelect: nav('/prompts') },
        { id: 'nav-queues', label: 'Queues', onSelect: nav('/queues') },
        { id: 'nav-notes', label: 'Notes', onSelect: nav('/notes') },
        {
          id: 'nav-generators',
          label: 'Generators',
          onSelect: nav('/generators'),
        },
      ],
    },
    {
      heading: 'Actions',
      items: [
        {
          id: 'action-plan-create',
          label: 'Create plan',
          onSelect: nav('/plans/new/create'),
        },
        {
          id: 'action-project-create',
          label: 'Create project',
          onSelect: nav('/projects/create'),
        },
        {
          id: 'action-queue-create',
          label: 'Create queue',
          onSelect: nav('/queues/create'),
        },
        {
          id: 'action-note-create',
          label: 'Create note',
          onSelect: nav('/notes/create'),
        },
        {
          id: 'action-generator-create',
          label: 'Create generator',
          onSelect: nav('/generators/create'),
        },
      ],
    },
    {
      heading: 'Filters',
      items: [
        {
          id: 'filter-pull-requests',
          label: 'Pull requests',
          onSelect: nav('/pull-requests'),
        },
        {
          id: 'filter-plans',
          label: 'Create plan',
          onSelect: nav('/plans'),
        },
      ],
    },
  ];

  return groups;
}
