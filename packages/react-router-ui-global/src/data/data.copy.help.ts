import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';

/**
 * @description Lead copy for the global help dialog (`?modal=help`): the dialog
 * title and a one-paragraph orientation on what OpenThrottle is.
 */
export const HELP_MODAL_COPY: {
  readonly description: string;
  readonly title: string;
} = {
  description:
    'OpenThrottle is a knowledge base for plans and tasks plus the agentic workflows that act on them. Capture work as plans, break it into ordered tasks, and drive agents against them — all from this developer app.',
  title: 'Help & shortcuts',
} as const;

export interface HelpShortcut {
  readonly keys: string;
  readonly label: string;
}

/**
 * @description Keyboard shortcuts wired into the shared chrome, shown as a list
 * in the help dialog. `keys` is rendered verbatim.
 */
export const HELP_SHORTCUTS: readonly HelpShortcut[] = [
  { keys: 'Cmd+K', label: 'Open the command palette to search and jump' },
  { keys: 'Cmd/Ctrl+B', label: 'Toggle the sidebar' },
] as const;

export interface HelpLink {
  readonly description: string;
  readonly href: string;
  readonly label: string;
}

/**
 * @description "Where to go next" links surfaced in the help dialog. External
 * targets (the GitHub org) open in a new tab; in-app paths stay in the app.
 */
export const HELP_LINKS: readonly HelpLink[] = [
  {
    description: 'Guides and reference for driving OpenThrottle.',
    href: '/docs',
    label: 'Docs',
  },
  {
    description: 'Answers to common questions.',
    href: '/faq',
    label: 'FAQ',
  },
  {
    description: 'Server metrics definitions and GraphQL endpoint health.',
    href: '/settings/debug',
    label: 'Settings → Debug',
  },
  {
    description: 'Source, issues, and discussions on GitHub.',
    href: OPENTHROTTLE_GITHUB_URL,
    label: 'GitHub',
  },
] as const;
