/**
 * @description Shared destinations for dashboard “Jump to” and compact cross-entity bars on list routes.
 */
interface WorkspaceJumpLink {
  readonly label: string;
  readonly to: string;
}

/** Core entities called out in discovery: dashboard, semantic search, plans, projects, notes. */
export const WORKSPACE_CORE_ENTITY_LINKS: readonly WorkspaceJumpLink[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Search', to: '/search' },
  { label: 'Plans', to: '/plans' },
  { label: 'Projects', to: '/projects' },
  { label: 'Notes', to: '/notes' },
];

/** Full palette aligned with command-palette-style navigation on the dashboard. */
export const WORKSPACE_FULL_JUMP_LINKS: readonly WorkspaceJumpLink[] = [
  { label: 'Search', to: '/search' },
  { label: 'Calendar', to: '/calendar' },
  { label: 'Plans', to: '/plans' },
  { label: 'Projects', to: '/projects' },
  { label: 'Prompts', to: '/prompts' },
  { label: 'Pull requests', to: '/pull-requests' },
  { label: 'Notes', to: '/notes' },
  { label: 'Queues', to: '/queues' },
  { label: 'Skills', to: '/skills' },
  { label: 'Generators', to: '/generators' },
  { label: 'Usage', to: '/usage' },
  { label: 'Settings', to: '/settings' },
];
