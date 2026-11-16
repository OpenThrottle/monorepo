import type { ProductProject } from '../types/product';

/**
 * @description The projects the org profile lists under "Project status", in
 * display order. Statuses change by hand when a project matures; the drift
 * gate checks every `path` still exists.
 * @public
 */
export const PRODUCT_PROJECTS = [
  {
    name: 'openthrottle-server',
    path: 'applications/openthrottle-server',
    status: 'stable',
    summary: 'NestJS code-first GraphQL API: the backbone of the platform.',
  },
  {
    name: 'openthrottle-developer',
    path: 'applications/openthrottle-developer',
    status: 'stable',
    summary: `The flagship developer portal for plans, projects, queues and PRs.`,
  },
  {
    name: 'openthrottle-mcp',
    path: 'packages/openthrottle-mcp',
    status: 'stable',
    summary: 'The MCP server that brings OT into every editor and agent.',
  },
  {
    name: 'openthrottle',
    path: 'applications/openthrottle',
    status: 'stable',
    summary: 'Quick start: the `docker compose up` entrypoint.',
  },
  {
    name: 'openthrottle-website',
    path: 'applications/openthrottle-website',
    status: 'stable',
    summary: '[openthrottle.ai](https://openthrottle.ai).',
  },
  {
    name: 'openthrottle-app',
    path: 'applications/openthrottle-app',
    status: 'experimental',
    summary: 'Electron desktop shell.',
  },
  {
    name: 'openthrottle-cms',
    path: 'applications/openthrottle-cms',
    status: 'experimental',
    summary: 'Content management for OpenThrottle sites.',
  },
  {
    name: 'openthrottle-admin',
    path: 'applications/openthrottle-admin',
    status: 'planned',
    summary: 'Team management, roles and permissions.',
  },
] as const satisfies readonly ProductProject[];
