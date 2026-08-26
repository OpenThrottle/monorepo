/**
 * @description Flow for `docs/marketing/scripts/04-mental-model.md`.
 *
 * Transcribed from that script's on-screen-action column, beat for beat. If the
 * script changes, change this; if this needs a step the script does not describe,
 * the script is wrong.
 *
 * One term per beat, each shown rather than described: the plan header, a task
 * row, a note, a project, and then the row-level project link that ties them
 * together. The script's original 0:41 beat asked for a project badge on the plan
 * detail page; no such badge exists — the plan→project relation is rendered
 * exactly one place in the app, the project link on a plan's row in `/plans`
 * (`plans-table-columns.tsx`), so that is what goes on camera. See the note in
 * `./episode.ts`.
 *
 * Seven flow beats, matching the script's seven narration rows — narration is
 * matched to flow beats POSITIONALLY (assemble/timeline.ts).
 */

import { click, dwell, highlight, navigate, waitFor } from '../../runner/types';
import type { DemoFlow } from '../../runner/types';

/** The rate-limiting plan from src/fixtures/demo-content.ts — same anchor as 01. */
const PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000001';

/** Its IN_PROGRESS task — the row the 0:12 beat points at. */
const TASK_ID = 'd0d0d0d0-0000-4000-8000-000000000102';

export const flow: DemoFlow = {
  id: '04-mental-model',
  // Tables and full-page detail views are wider than the portrait crop window;
  // cropping them clips text at both edges. Fit and letterbox instead.
  portraitStrategy: 'fit',
  regionOfInterest: {
    hold: '[data-testid="GlobalHeading"]',
    hook: '[data-testid="GlobalHeading"]',
    note: '[data-testid="MarkdownRenderer"]',
    plan: '[data-testid="GlobalHeading"]',
    project: '#project-overview-heading',
    relations: '[data-testid="PlansTable"]',
    task: `#task-${TASK_ID}`,
  },
  steps: [
    // 0:00 — plan detail, tasks already visible. The tab is URL-synced, so the
    // flow lands on it directly instead of clicking through.
    navigate(`/plans/${PLAN_ID}?tab=tasks`, 'hook'),
    waitFor(`#task-${TASK_ID}`),
    dwell(1_600),

    // 0:05 — "a plan is a goal with an ordered list of work under it."
    highlight('[data-testid="GlobalHeading"]', 1_800, 'plan'),
    dwell(2_400),

    // 0:12 — "a task is one unit of that work" — the IN_PROGRESS row.
    highlight(`#task-${TASK_ID}`, 2_000, 'task'),
    dwell(3_200),

    // 0:21 — a note. The first row is the newest fixture note ("429 vs 503"),
    // which is the rate-limiting plan's own lesson — the continuity is deliberate.
    navigate('/notes', 'note'),
    waitFor('[data-testid="NotesTable"]'),
    dwell(900),
    click('a[aria-label^="View note:"]'),
    waitFor('[data-testid="MarkdownRenderer"]'),
    dwell(3_400),

    // 0:31 — a project: a checkout on disk.
    navigate('/projects', 'project'),
    waitFor('[data-testid="ProjectsTable"]'),
    dwell(900),
    click('a[aria-label^="View project:"]'),
    waitFor('#project-overview-heading'),
    dwell(3_400),

    // 0:41 — how they relate: the project link on a plan's row is the one place
    // the app renders the plan→project edge.
    navigate('/plans', 'relations'),
    waitFor('[data-testid="PlansTable"]'),
    dwell(700),
    highlight(
      '[data-testid="PlansTable"] tbody tr:first-child a[aria-label^="Project:"]',
      2_000,
    ),
    dwell(2_600),

    // 0:50 — hold on the plan the short opened on.
    navigate(`/plans/${PLAN_ID}?tab=tasks`, 'hold'),
    waitFor('[data-testid="GlobalHeading"]'),
    dwell(2_600),
  ],
  title: 'Plans, tasks, notes, projects — the mental model',
};
