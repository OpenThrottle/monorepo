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

/**
 * Tunables for the interactive hero dot-mesh (see `useDotGridMesh`).
 *
 * The hero renders a lattice of dots pinned at grid intersections, wired to
 * their right/down neighbours. The pointer repels nearby dots (warping the
 * lattice) and they spring back home with damping — the always-dark hero's
 * living replacement for the old static drifting-grid CSS backdrop. Colour is a
 * fixed light tint (the paper token's RGB) because the hero is intentionally
 * dark in both site themes.
 */
export const LANDING_DOT_MESH = {
  /** Fixed light dot/line colour as "r, g, b" (hero is always dark). */
  color: '243, 240, 234',
  /** Damping applied to velocity each frame (lower = stiffer settle). */
  damping: 0.82,
  /** Base opacity of a resting dot. */
  dotAlpha: 0.26,
  /** Extra dot opacity added at the centre of the pointer's influence. */
  dotGlow: 0.6,
  /** Base dot radius in CSS px. */
  dotRadius: 1.4,
  /** Subtle idle wobble amplitude in px, so the lattice breathes at rest. */
  idleAmplitude: 2.4,
  /** Base opacity of a resting connection line. */
  lineAlpha: 0.09,
  /** Extra line opacity added within the pointer's influence. */
  lineGlow: 0.28,
  /** Max distance (px) a dot may stray from its home before it is clamped. */
  maxDisplace: 42,
  /** Strength of the pointer's outward push. */
  repelForce: 2.4,
  /** Pointer influence radius in px (repulsion + proximity glow). */
  repelRadius: 140,
  /** Grid spacing in px between neighbouring dots. */
  spacing: 60,
  /** Pull-back-to-home strength each frame (higher = snappier). */
  spring: 0.08,
} as const;

/**
 * Tunables for the velocity-reactive hero "sound wave" arcs (see
 * `useSoundArcs`). `n` stacked Béziers sweep across the hero (default 3); a
 * travelling sine ripples along each one, and its amplitude swells with
 * pointer speed — fast mouse movement reads like an oscilloscope going loud,
 * then rings back to a calm idle. Colour is the brand → signal → paper
 * gradient carried over from the old static arc SVG.
 */
const SOUND_ARC_STACK = {
  /**
   * Right-side fan, -1..1. 0 packs every exit onto the lead path; 1 / -1
   * span most of the right edge in opposite directions.
   */
  distributionEnd: 0.28,
  /**
   * Left-side fan, -1..1. 0 packs every entry onto the lead path; 1 / -1
   * span most of the left edge in opposite directions.
   */
  distributionStart: 0.22,
  /** Stacked wave count. */
  n: 21,
  /** Jitter amplitude in normalised space applied to Bézier handles. */
  noise: 0.022,
  /** PRNG seed so the jitter is stable across reloads. */
  seed: 0x51ed,
} as const;

export const LANDING_SOUND_ARCS = {
  /**
   * Stack tunables in normalised [x, y] space (0..1 of the hero box). `n`
   * cubics fan around a lead stroke; `distributionStart` / `distributionEnd`
   * (-1..1; 0 = packed, ±1 = far apart) set how much of the left vs right
   * edge they cover. Geometry is built at draw time from these plus `noise`
   * / `seed`.
   */
  ...SOUND_ARC_STACK,
  /** Attack rate as energy rises toward a faster pointer (snappy). */
  attack: 0.24,
  /** Gradient stops as "r, g, b" — brand red → teal signal → paper. */
  colorEnd: '243, 240, 234',
  colorMid: '30, 120, 104',
  colorStart: '229, 20, 20',
  /** Extra amplitude (px) at full pointer energy. */
  gain: 42,
  /** Resting ripple amplitude (px) so the arcs breathe even when idle. */
  idleAmplitude: 4,
  /** Stroke width in px. */
  lineWidth: 1.5,
  /** Release rate as energy decays after the pointer slows (rings out). */
  release: 0.05,
  /** Points sampled along each arc when drawing. */
  samples: 96,
  /** Constant travelling-phase speed (radians per ms) — the wave always moves. */
  speed: 0.004,
  /** How much full pointer energy multiplies the travelling speed (0 = none). */
  speedGain: 6,
  /** Pointer speed (px/ms) that maps to full energy. */
  velocityRef: 2.2,
  /** Number of sine cycles along the arc length. */
  waveCycles: 3.2,
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
