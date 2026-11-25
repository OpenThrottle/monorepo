import type { ProductFeatureStatus } from '@openthrottle/openthrottle-product';
import {
  getPublicFeatures,
  isLandedFeature,
  isUpcomingFeature,
  PRODUCT_FEATURES,
  PRODUCT_POSITIONING,
} from '@openthrottle/openthrottle-product';
import {
  OPENTHROTTLE_GITHUB_URL,
  OPENTHROTTLE_GITHUB_URL_MONOREPO,
} from '@openthrottle/react-router-utils';

/**
 * Landing page copy and links.
 *
 * Product copy (positioning, pillars, features, roadmap) comes from the typed
 * registry in `@openthrottle/openthrottle-product`; never hand-write it here.
 * Only website-only strings live in this file: nav, CTAs, section kickers and
 * the code block. Repo links go through `OPENTHROTTLE_GITHUB_URL_MONOREPO`.
 */

const GITHUB_ORG_URL = OPENTHROTTLE_GITHUB_URL;
const GITHUB_MONOREPO_URL = OPENTHROTTLE_GITHUB_URL_MONOREPO;
const QUICKSTART_URL = `${GITHUB_MONOREPO_URL}/blob/main/docs/openthrottle/local-quickstart.md`;

export interface LandingLink {
  external?: boolean;
  href: string;
  label: string;
  /** Hidden unless the blog is published (`isBlogEnabled()`). */
  requiresBlog?: true;
}

export interface LandingStep {
  body: string;
  title: string;
}

export const LANDING_NAV = {
  brand: 'OpenThrottle',
  links: [
    { href: '#how', label: 'How it works' },
    { href: '#features', label: 'Features' },
    { href: '#roadmap', label: 'Roadmap' },
    { href: '/blog', label: 'Blog', requiresBlog: true },
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
    PRODUCT_POSITIONING.tagline.short,
    'Every commit + why it shipped',
    'Every commit knows why it exists',
    'Shipped code, still tied to the plan',
    'The commit remembers the task',
    'Plan it. Run it. Ship it. Point back',
    'Your plans. Your runs. Your git history',
    'Run agents on your box. Keep the receipts',
    'Stop losing the agent run',
    "Chat forgot. The commit shouldn't",
  ],
  lede: PRODUCT_POSITIONING.tagline.medium,
  wordmark: { accent: 'Throttle', lead: 'Open' },
} as const;

export const LANDING_PROMISE = {
  kicker: 'Why it exists',
  lede: PRODUCT_POSITIONING.lede.long,
  title: PRODUCT_POSITIONING.tagline.short,
} as const;

export const LANDING_FLOW = {
  kicker: 'How it works',
  lede: PRODUCT_POSITIONING.lede.medium,
  steps: PRODUCT_POSITIONING.pillars.map((pillar) => {
    return { body: pillar.medium, title: pillar.name };
  }),
  title: PRODUCT_POSITIONING.lede.short,
} as const;

export const LANDING_FEATURES = {
  cards: getPublicFeatures(PRODUCT_FEATURES)
    .filter(isLandedFeature)
    .map((feature) => {
      return {
        body: feature.oneLiner,
        isPreview: feature.status === 'preview',
        title: feature.name,
      };
    }),
  kicker: 'Features',
  lede: PRODUCT_POSITIONING.closing,
  previewLabel: 'Preview',
  title: 'What you can run today.',
} as const;

export const LANDING_ROADMAP = {
  /** In-flight entries first, then planned; registry order within each. */
  items: [
    ...getPublicFeatures(PRODUCT_FEATURES).filter((feature) => {
      return feature.status === 'in-flight';
    }),
    ...getPublicFeatures(PRODUCT_FEATURES).filter((feature) => {
      return feature.status === 'planned';
    }),
  ].filter(isUpcomingFeature),
  kicker: 'Roadmap',
  lede: 'A curated look at what is being built now and what comes next.',
  statusLabels: {
    'in-flight': 'In flight',
    planned: 'Planned',
    preview: 'Preview',
    shipped: 'Shipped',
  } satisfies Record<ProductFeatureStatus, string>,
  title: 'Where OpenThrottle is heading.',
} as const;

export const LANDING_CLOSE = {
  code: [
    { kind: 'comment', text: '# Clone OpenThrottle' },
    {
      kind: 'command',
      text: 'git clone https://github.com/openthrottle/monorepo.git',
    },
    { kind: 'blank', text: '' },
    { kind: 'comment', text: '# CD in and get setup' },
    { kind: 'command', text: 'cd monorepo && ./scripts/setup.sh' },
    { kind: 'blank', text: '' },
    { kind: 'comment', text: '# And start moving faster!' },
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
