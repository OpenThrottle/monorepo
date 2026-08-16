import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';

/**
 * Landing page copy and links, translated from the source mockup.
 *
 * All user-facing strings for the home route live here so components stay
 * presentational. External links are composed from the shared
 * `OPENTHROTTLE_GITHUB_URL` constant (the org root) rather than hardcoding a
 * repo URL, so there is a single source of truth for the GitHub target.
 */

const GITHUB_ORG_URL = OPENTHROTTLE_GITHUB_URL;
const GITHUB_MONOREPO_URL = `${OPENTHROTTLE_GITHUB_URL}/monorepo`;
const QUICKSTART_URL = `${GITHUB_MONOREPO_URL}/blob/main/docs/openthrottle/local-quickstart.md`;

export interface LandingLink {
  external?: boolean;
  href: string;
  label: string;
}

export interface LandingStep {
  body: string;
  title: string;
}

export const LANDING_NAV = {
  brand: 'OpenThrottle',
  links: [
    { href: '#how', label: 'How it works' },
    { href: '#surfaces', label: 'Surfaces' },
    { external: true, href: GITHUB_ORG_URL, label: 'GitHub' },
  ] satisfies LandingLink[],
} as const;

export const LANDING_HERO = {
  ctas: {
    primary: {
      external: true,
      href: GITHUB_ORG_URL,
      label: 'View on GitHub',
    } satisfies LandingLink,
    secondary: {
      href: '#start',
      label: 'Get started locally',
    } satisfies LandingLink,
  },
  /** Cross-fade duration when the headline swaps (ms). */
  headlineCrossfadeMs: 550,
  /** Auto-advance delay for the rotating hero headline (ms). */
  headlineIntervalMs: 5_000,
  headlines: [
    'Every commit + why it shipped',
    'Every commit knows why it exists',
    'Shipped code, still tied to the plan',
    'The commit remembers the task',
    'Plan it. Run it. Ship it. Point back',
    'One task at a time — all the way to git',
    'Your plans. Your runs. Your git history',
    'Run agents on your box. Keep the receipts',
    'Stop losing the agent run',
    "Chat forgot. The commit shouldn't",
  ],
  lede: 'The self-hostable harness that turns plans into agent runs and keeps every commit linked to the work that produced it.',
  wordmark: { accent: 'Throttle', lead: 'Open' },
} as const;

export const LANDING_PROMISE = {
  kicker: 'Why it exists',
  lede: 'Chat tabs forget. Markdown plans drift. Issue trackers never see the agent run. OpenThrottle keeps plans, tasks, output, and commits in one Postgres-backed system — reachable from your editor over MCP, and owned entirely by you.',
  title: 'One substrate for planning and agentic execution.',
} as const;

export const LANDING_FLOW = {
  kicker: 'How it works',
  lede: 'Ralph drives one task at a time. Progress streams live. Merged commits carry Plan-Id and Task-Id so you can ask what shipped — and why the code exists.',
  steps: [
    {
      body: 'Capture intent as durable plans and tasks — not scattered Markdown.',
      title: 'Plan',
    },
    {
      body: 'Run agents through Ralph, one scoped task at a time, with live output.',
      title: 'Execute',
    },
    {
      body: 'Search plans, tasks, and docs by meaning with semantic memory.',
      title: 'Remember',
    },
    {
      body: 'Link shipped commits back to the plan and task that produced them.',
      title: 'Trace',
    },
  ] satisfies LandingStep[],
  title: 'Idea in. Traceable work out.',
} as const;

export const LANDING_SURFACES = {
  cards: [
    {
      body: 'Agents create plans, update tasks, stream output, and search institutional memory from Cursor and other MCP clients.',
      title: 'MCP',
    },
    {
      body: 'A dashboard for humans: what’s in progress, what shipped, and what’s next — without leaving the loop.',
      title: 'Developer app',
    },
    {
      body: 'Queue-backed agentic execution with worktrees and commit traceability built for one-task-at-a-time runs.',
      title: 'Ralph loop',
    },
  ] satisfies LandingStep[],
  kicker: 'Surfaces',
  lede: 'Bring your agent host and editor. Every surface reads and writes the same plans and tasks.',
  title: 'Same source of truth, wherever you work.',
} as const;

export const LANDING_CLOSE = {
  code: [
    { kind: 'comment', text: '# from the monorepo root' },
    { kind: 'command', text: './scripts/setup.sh' },
    { kind: 'command', text: 'pnpm run start' },
    { kind: 'blank', text: '' },
    { kind: 'comment', text: '# developer  → :6020' },
    { kind: 'comment', text: '# server     → :6021' },
  ] as const,
  ctas: {
    primary: {
      external: true,
      href: GITHUB_MONOREPO_URL,
      label: 'Clone the monorepo',
    } satisfies LandingLink,
    secondary: {
      external: true,
      href: QUICKSTART_URL,
      label: 'Read the quickstart',
    } satisfies LandingLink,
  },
  kicker: 'Self-host',
  lede: 'Open core, Apache-2.0. Postgres, Redis, GraphQL, and the developer app in one monorepo. Local models welcome.',
  title: 'Run it on your box.',
} as const;
