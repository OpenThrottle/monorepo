/**
 * @description The demo workspace's entire content, as data. Every value here is
 * FICTIONAL — no real repository, org, branch, email or person appears. That is
 * not a style preference: this fixture is the primary leak-prevention control for
 * the screencast pipeline (see docs/marketing/publish-checklist.md). If you need a
 * new plan for a video, invent one here rather than recording against real data.
 *
 * Timestamps are OFFSETS IN MINUTES from the seed moment, not absolute dates. The
 * UI renders relative time ("2 hours ago"), so an absolute date would drift on
 * every take and eventually read "8 months ago". Offsets mean take 7 looks like
 * take 1 as long as it is recorded against a fresh seed.
 *
 * IDs are fixed so flows can deep-link (`/plans/<id>`) without a lookup, and so a
 * re-seed produces byte-identical URLs.
 */

/**
 * Fixed uuid namespace for demo rows. The `d0d0d0d0` prefix is valid hex and
 * unmistakable in a database dump, so a demo row can never be confused for a real
 * one. Suffixes must be hex too.
 */
const id = (suffix: string): string =>
  `d0d0d0d0-0000-4000-8000-${suffix.padStart(12, '0')}`;

export const DEMO_USER = {
  email: 'ada@atlasworks.example',
  githubUsername: 'atlas-ada',
  password: 'DemoThrottle2026!',
} as const;

/**
 * The fictional machine the shell surfaces render.
 *
 * `repositoryRoot` is absolute because the thing 05 asks the viewer to copy is an
 * absolute launcher path, and the frame has to show one. It is NOT under a home
 * directory, and that is the whole point: `scan/rules.ts` rule `home-path` fails on
 * `/Users/<anything>` and `/home/<anything>` — a fictional username does not help,
 * only a root that is not a home directory does. `/workspace` is the conventional
 * devcontainer mount, so it reads as a real machine without being one.
 *
 * `shellPrompt` is a directory NAME rather than a path. A prompt is the easiest
 * place in a short to leak a home directory and it never needs to carry one.
 */
export const DEMO_MACHINE = {
  repositoryRoot: '/workspace/openthrottle',
  shellPrompt: 'openthrottle',
} as const;

export const DEMO_PROJECTS = [
  {
    description: 'Public HTTP API for the Atlas mapping service.',
    id: id('a1'),
    name: 'atlas-api',
    nxProjectName: 'atlas-api',
  },
  {
    description: 'Customer-facing dashboard for Atlas.',
    id: id('a2'),
    name: 'atlas-web',
    nxProjectName: 'atlas-web',
  },
  {
    // The dogfood project. The skill-availability resolver treats the exact
    // nx name 'OpenThrottle/monorepo' as the workspace's own project, and
    // `/rules/new`'s skill dropdown lists ITS `project_skills` when no explicit
    // project is in scope — so video 09's rule form has nothing to pick without
    // this row. Not a leak: it names the product, not a machine or a person.
    description: 'OpenThrottle itself — the workspace these demos run in.',
    id: id('a3'),
    name: 'openthrottle',
    nxProjectName: 'OpenThrottle/monorepo',
  },
] as const;

/**
 * Skills on the dogfood project, for video 09's rule form. Fictional slugs with
 * the shape of real ones; `/rules/new` lists them, and the seeded rule below
 * injects one. The inject-task executor does not require the slug to exist, but
 * the on-camera dropdown does.
 */
export const DEMO_SKILLS = [
  {
    description: 'A structured review checklist for a plan before merge.',
    id: id('51'),
    slug: 'code-review-checklist',
    sourcePath: '.agents/skills/code-review-checklist/SKILL.md',
    tags: ['pr-review'],
  },
  {
    description: 'Write or extend tests for the work a plan describes.',
    id: id('52'),
    slug: 'write-tests',
    sourcePath: '.agents/skills/write-tests/SKILL.md',
    tags: ['testing'],
  },
  {
    description: 'Draft release notes from a plan and its commits.',
    id: id('53'),
    slug: 'draft-release-notes',
    sourcePath: '.agents/skills/draft-release-notes/SKILL.md',
    tags: ['docs'],
  },
] as const;

/**
 * The tag video 09 adds on camera at 0:00. Not in the platform's default
 * vocabulary, so the seed inserts it (alongside the defaults — the vocabulary
 * only self-seeds for a user with ZERO rows, so a partial insert would suppress
 * the rest).
 */
export const DEMO_EXTRA_TAG = {
  dimension: 'domain',
  tag: 'needs-review',
} as const;

/**
 * One pre-existing, enabled tag→action rule — the one that fires at video 09's
 * 0:00 beat. Adding `needs-review` to any plan injects a review task titled
 * from the template, so the injected row the camera lands on names the plan.
 */
export const DEMO_RULES = [
  {
    actionPayload: {
      placement: 'last',
      skillSlug: 'code-review-checklist',
      titleTemplate: 'Review: {{plan.title}}',
    },
    actionType: 'inject-task',
    createdAtOffset: -5000,
    id: id('61'),
    tagAll: ['needs-review'],
    title: 'Review anything tagged needs-review',
  },
] as const;

export interface DemoTask {
  readonly category: string;
  readonly completedAtOffset?: number;
  readonly createdAtOffset: number;
  readonly description: string;
  readonly id: string;
  readonly sortOrder: number;
  readonly status: string;
  readonly summary: string;
  readonly title: string;
}

export interface DemoPlan {
  readonly assignee: string;
  readonly author: string;
  readonly category: string;
  readonly completedAtOffset?: number;
  readonly createdAtOffset: number;
  readonly description: string;
  readonly id: string;
  readonly projectId?: string;
  readonly status: string;
  readonly summary: string;
  readonly tasks: readonly DemoTask[];
  readonly title: string;
}

/**
 * Eleven plans spread across statuses and dates. The spread matters: the dashboard
 * renders activity over time, and a single-day spike looks like a demo instead of
 * a workspace someone uses.
 *
 * Ordered newest first, matching `/plans`' own default (`createdAt DESC`), so the
 * plan a flow expects at the top of the table is the one at the top of this list.
 */
export const DEMO_PLANS: readonly DemoPlan[] = [
  {
    // Video 05's payoff: the plan the agent wrote over MCP, one minute before the
    // recording. Its own plan rather than a reuse of the rate-limiting one, because
    // 03 CREATES that plan on camera — one plan with two different origin stories
    // across a season is a continuity error a viewer will notice.
    //
    // Newest `createdAtOffset` in the fixture, so it lands at the top of /plans:
    // `listPlansByStatus` orders `createdAt DESC` by default.
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'feature',
    createdAtOffset: -1,
    description: `Requests cross the gateway, the tile service and the cache with no shared correlation id, so a slow request cannot be followed past the first hop. Propagate a trace id end to end and record a span per hop.\n\nOut of scope: sampling policy.`,
    id: id('11'),
    projectId: id('a1'),
    status: 'PENDING',
    summary: 'Follow one request across every hop with a shared trace id.',
    tasks: [
      {
        category: 'implementation',
        createdAtOffset: -1,
        description: `Accept an inbound trace id when one is present and mint one when it is not, then attach it to the request context.`,
        id: id('1101'),
        sortOrder: 1000,
        status: 'PENDING',
        summary: 'Mint or adopt a trace id at the edge.',
        title: 'Propagate a trace id through the gateway',
      },
      {
        category: 'implementation',
        createdAtOffset: -1,
        description: `Wrap each outbound call in a span carrying the trace id, so a request that fans out stays one trace.`,
        id: id('1102'),
        sortOrder: 2000,
        status: 'PENDING',
        summary: 'A span per outbound hop.',
        title: 'Record a span per downstream call',
      },
      {
        category: 'implementation',
        createdAtOffset: -1,
        description: `Put the trace id on every log line so a log search and a trace search agree, and document the field.`,
        id: id('1103'),
        sortOrder: 3000,
        status: 'PENDING',
        summary: 'Logs and traces share one id.',
        title: 'Emit the trace id on every log line',
      },
    ],
    title: 'Add request tracing to the gateway',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'feature',
    createdAtOffset: -95,
    description: `The public API has no per-client limits, so one noisy integration can starve everyone else. Add a token bucket at the gateway, keyed by API key, with limits configurable per plan tier.\n\nOut of scope: billing for overages.`,
    id: id('01'),
    projectId: id('a1'),
    status: 'IN_PROGRESS',
    summary: `Protect the public endpoints from bursts with a per-key token bucket.`,
    tasks: [
      {
        category: 'implementation',
        completedAtOffset: -71,
        createdAtOffset: -94,
        description: `A reusable token bucket with a configurable rate and burst size, plus tests for the refill edges.`,
        id: id('0101'),
        sortOrder: 1000,
        status: 'COMPLETED',
        summary: 'The bucket itself, with tests.',
        title: 'Implement the token bucket',
      },
      {
        category: 'implementation',
        createdAtOffset: -94,
        description: `Read the API key from the request, look up its tier, and apply the matching bucket before the handler runs.`,
        id: id('0102'),
        sortOrder: 2000,
        status: 'IN_PROGRESS',
        summary: 'Wire the bucket into the gateway middleware.',
        title: 'Apply the bucket per API key',
      },
      {
        category: 'implementation',
        createdAtOffset: -94,
        description: `Return 429 with Retry-After and a machine-readable body, and document the shape.`,
        id: id('0103'),
        sortOrder: 3000,
        status: 'PENDING',
        summary: 'A 429 clients can actually handle.',
        title: 'Return a useful rate-limit response',
      },
    ],
    title: 'Add rate limiting to the public API',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'bug',
    completedAtOffset: -2380,
    createdAtOffset: -2900,
    description: `Tile requests near the antimeridian return an empty result because the bounding box is normalised before the wrap is applied. Fix the order and add a regression case at longitude 180.`,
    id: id('02'),
    projectId: id('a1'),
    status: 'COMPLETED',
    summary: 'Tiles crossing longitude 180 came back empty.',
    tasks: [
      {
        category: 'bug',
        completedAtOffset: -2500,
        createdAtOffset: -2890,
        description: `A failing test at longitude 180 before any fix, so the fix is provably the fix.`,
        id: id('0201'),
        sortOrder: 1000,
        status: 'COMPLETED',
        summary: 'Reproduce it in a test first.',
        title: 'Add a failing regression test',
      },
      {
        category: 'bug',
        completedAtOffset: -2390,
        createdAtOffset: -2890,
        description: `Apply the wrap before normalising, and keep the normalisation for every other case.`,
        id: id('0202'),
        sortOrder: 2000,
        status: 'COMPLETED',
        summary: 'Wrap first, then normalise.',
        title: 'Correct the bounding-box order',
      },
    ],
    title: 'Fix empty tiles at the antimeridian',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'chore',
    createdAtOffset: -240,
    description: `The dashboard bundle is 1.8 MB and the map library is half of it. Split the map route so the landing page stops paying for a component most visitors never reach.`,
    id: id('03'),
    projectId: id('a2'),
    status: 'QUEUED',
    summary: 'Split the map route out of the main bundle.',
    tasks: [
      {
        category: 'chore',
        createdAtOffset: -239,
        description: `Record the current bundle composition so the improvement is a number, not an impression.`,
        id: id('0301'),
        sortOrder: 1000,
        status: 'PENDING',
        summary: 'Measure before changing anything.',
        title: 'Baseline the bundle',
      },
      {
        category: 'chore',
        createdAtOffset: -239,
        description: `Lazy-load the map route and confirm the landing page no longer pulls the map library.`,
        id: id('0302'),
        sortOrder: 2000,
        status: 'PENDING',
        summary: 'Lazy-load the heavy route.',
        title: 'Split the map route',
      },
    ],
    title: 'Cut the dashboard bundle in half',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'feature',
    createdAtOffset: -1440,
    description: `Support saved views so a user can return to a bounding box, zoom level and layer set without rebuilding it by hand every session.`,
    id: id('04'),
    projectId: id('a2'),
    status: 'PENDING',
    summary: 'Let users save and reopen a map view.',
    tasks: [
      {
        category: 'design',
        createdAtOffset: -1430,
        description: `Decide what a view actually contains, and what happens when a layer it references is deleted.`,
        id: id('0401'),
        sortOrder: 1000,
        status: 'PENDING',
        summary: 'Define the shape of a saved view.',
        title: 'Model the saved view',
      },
      {
        // Video 08's subject: a task whose description has visibly outgrown one
        // task. It enumerates five distinct pieces of work on purpose — the short's
        // opening line is "this started as one task, it is clearly five", and the
        // viewer should be able to count them on screen. Promotion requires the
        // parent plan to be neither running nor terminal; this plan is PENDING.
        category: 'feature',
        createdAtOffset: -1420,
        description: `A saved view nobody else can open is half the feature. Making views shareable turns out to be several changes, each with its own tests:\n\n1. A visibility field on the view — private, team or org — with private as the default and a migration for every existing view.\n2. A visibility picker in the save dialog, plus an edit path for views saved before the field existed.\n3. A team-views index so a shared view is discoverable rather than a URL someone pastes in chat.\n4. Permissions: renaming and deleting a shared view should be the owner and admins, not whoever opened it.\n5. Audit events for share and unshare, because support will be asked "who made this visible" within a week of shipping.\n\nEach of these is independently shippable and none of them blocks the others past the first.`,
        id: id('0402'),
        sortOrder: 2000,
        status: 'PENDING',
        summary:
          'Sharing, permissions, discovery and audit — scoped as one task.',
        title: 'Share saved views across the team',
      },
    ],
    title: 'Saved map views',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'infrastructure',
    completedAtOffset: -8000,
    createdAtOffset: -11000,
    description: `Move the tile cache off the app nodes and onto a shared store so a deploy stops cold-starting every client.`,
    id: id('05'),
    projectId: id('a1'),
    status: 'COMPLETED',
    summary: 'A shared tile cache that survives deploys.',
    tasks: [
      {
        category: 'infrastructure',
        completedAtOffset: -8100,
        createdAtOffset: -10900,
        description: `Provision the shared store and prove a warm read path end to end.`,
        id: id('0501'),
        sortOrder: 1000,
        status: 'COMPLETED',
        summary: 'Stand up the shared store.',
        title: 'Provision the cache',
      },
    ],
    title: 'Move the tile cache off the app nodes',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'documentation',
    createdAtOffset: -600,
    description: `The quickstart still describes the old auth header. Rewrite it against the current API and add a working example request.`,
    id: id('06'),
    projectId: id('a1'),
    status: 'PENDING',
    summary: 'The quickstart no longer matches the API.',
    tasks: [
      {
        category: 'documentation',
        createdAtOffset: -590,
        description: `Replace the stale header example and verify every request in the page against a live endpoint.`,
        id: id('0601'),
        sortOrder: 1000,
        status: 'PENDING',
        summary: 'Fix the auth section.',
        title: 'Correct the auth example',
      },
    ],
    title: 'Rewrite the API quickstart',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'feature',
    createdAtOffset: -30,
    description: `Expose the layer catalogue over the API so integrations can discover layers instead of hard-coding names.`,
    id: id('07'),
    projectId: id('a1'),
    status: 'PENDING',
    summary: 'Make layers discoverable over the API.',
    tasks: [
      {
        category: 'implementation',
        createdAtOffset: -29,
        description: `Return the catalogue with stable ids, so a rename does not break a caller.`,
        id: id('0701'),
        sortOrder: 1000,
        status: 'PENDING',
        summary: 'The endpoint, with stable ids.',
        title: 'Add the catalogue endpoint',
      },
    ],
    title: 'Publish a layer catalogue endpoint',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'bug',
    createdAtOffset: -4300,
    description: `Two clients reported duplicate webhook deliveries. Suspected retry without an idempotency key. Needs a reproduction before anything is changed.`,
    id: id('08'),
    projectId: id('a1'),
    status: 'BLOCKED',
    summary: 'Webhooks deliver twice under retry.',
    tasks: [
      {
        category: 'bug',
        createdAtOffset: -4290,
        description: `Blocked: needs delivery logs from the affected window, which are not retained that far back.`,
        id: id('0801'),
        sortOrder: 1000,
        status: 'BLOCKED',
        summary: 'Reproduce the duplicate delivery.',
        title: 'Reproduce it',
      },
    ],
    title: 'Duplicate webhook deliveries',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'chore',
    completedAtOffset: -14000,
    createdAtOffset: -16000,
    description: `Upgrade the tile renderer to the current major and drop the two patches we were carrying.`,
    id: id('09'),
    projectId: id('a1'),
    status: 'COMPLETED',
    summary: 'Renderer upgrade, patches dropped.',
    tasks: [
      {
        category: 'chore',
        completedAtOffset: -14100,
        createdAtOffset: -15900,
        description: `Upgrade, then remove both local patches and confirm rendering is unchanged.`,
        id: id('0901'),
        sortOrder: 1000,
        status: 'COMPLETED',
        summary: 'Upgrade and drop the patches.',
        title: 'Do the upgrade',
      },
    ],
    title: 'Upgrade the tile renderer',
  },
  {
    assignee: 'atlas-ada',
    author: 'atlas-ada',
    category: 'feature',
    createdAtOffset: -7200,
    description: `Cancelled in favour of the saved-views plan, which covers the same need without a second concept.`,
    id: id('10'),
    projectId: id('a2'),
    status: 'CANCELED',
    summary: 'Superseded by saved views.',
    tasks: [],
    title: 'Bookmarkable layer presets',
  },
];

/**
 * The pre-baked run output for the replay videos.
 *
 * Offsets are unique and strictly increasing. Two chunks sharing a timestamp render
 * in an unstable order, and the first take of the pilot showed "Task 1 -> IN_PROGRESS"
 * above "Starting plan run" because of it.
 *
 * Used by videos 11, 12, 14, 15 and L1's third act. Recording a live model call
 * gives a different video every take and can fail a take outright; this is real UI
 * over recorded output.
 */
export const DEMO_RUN = {
  branch: 'feat/rate-limit-per-key',
  chunks: [
    {
      content: 'Starting plan run for "Add rate limiting to the public API".',
      offset: -19.0,
    },
    {
      content: 'Task 1/3 "Implement the token bucket" -> IN_PROGRESS',
      offset: -18.0,
    },
    {
      content: 'Reading src/gateway/throttle/bucket.ts',
      offset: -17.0,
    },
    {
      content: 'Writing src/gateway/throttle/bucket.ts (+94 -0)',
      offset: -16.0,
    },
    {
      content: 'Writing src/gateway/throttle/__tests__/bucket.test.ts (+61 -0)',
      offset: -15.0,
    },
    {
      content: '$ pnpm test --filter atlas-api throttle',
      offset: -14.0,
    },
    {
      content: `FAIL bucket.test.ts > refills to exactly the burst size\n  expected 10 received 11`,
      offset: -13.0,
    },
    {
      content: 'Off by one on the refill clamp. Fixing.',
      offset: -12.0,
    },
    {
      content: 'Writing src/gateway/throttle/bucket.ts (+2 -2)',
      offset: -11.0,
    },
    {
      content: '$ pnpm test --filter atlas-api throttle',
      offset: -10.0,
    },
    {
      content: 'PASS bucket.test.ts (7 tests)',
      offset: -9.0,
    },
    {
      content: '$ pnpm lint --filter atlas-api  -> clean',
      offset: -8.0,
    },
    {
      content: 'Task 1/3 "Implement the token bucket" -> COMPLETED',
      offset: -7.0,
    },
    {
      content: `Committed 4f2a1c8 feat(atlas-api): add a token bucket for per-key rate limiting`,
      offset: -6.0,
    },
    {
      content: 'Task 2/3 "Apply the bucket per API key" -> IN_PROGRESS',
      offset: -5.0,
    },
    {
      content: 'Reading src/gateway/middleware/index.ts',
      offset: -4.0,
    },
    {
      content: 'Writing src/gateway/middleware/throttle.ts (+48 -0)',
      offset: -3.0,
    },
    {
      content: '$ pnpm test --filter atlas-api gateway',
      offset: -2.0,
    },
    {
      content: 'PASS gateway middleware (12 tests)',
      offset: -1.0,
    },
  ],
  model: 'claude-sonnet-5',
  planId: id('01'),
  taskId: id('0101'),
} as const;

/** Notes: the kind of thing that would otherwise die in a chat thread. */
export const DEMO_NOTES = [
  {
    content: `# Tile cache invalidation\n\nInvalidating a tile does NOT invalidate its parents. If a layer changes, walk up to zoom 0 or the overview tiles keep serving the old geometry for an hour. Cost us a morning.`,
    createdAtOffset: -2000,
    id: id('e1'),
  },
  {
    content: `# 429 vs 503\n\nClients retry a 503 immediately and back off on a 429. Return 429 for rate limits even when the cause is capacity, or well-behaved clients hammer us hardest exactly when we are struggling.`,
    createdAtOffset: -900,
    id: id('e2'),
  },
  {
    content: `# Antimeridian\n\nAnything that takes a bounding box needs a test at longitude 180. Wrap before you normalise. Every geo bug we have shipped has been this bug wearing a different hat.`,
    createdAtOffset: -2400,
    id: id('e3'),
  },
  {
    content: `# Deploys and the tile cache\n\nSince the cache moved off the app nodes, a deploy no longer cold-starts clients. Do not "simplify" it back to in-process; that is what the shared store is for.`,
    createdAtOffset: -7900,
    id: id('e4'),
  },
] as const;
