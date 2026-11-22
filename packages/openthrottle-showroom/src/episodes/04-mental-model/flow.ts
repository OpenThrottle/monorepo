/**
 * @description Flow for episode `04-mental-model` (`./episode.ts`).
 *
 * Transcribed from the episode's beat actions, beat for beat. If the episode
 * changes, change this; if this needs a step the episode does not describe, the
 * episode is wrong.
 *
 * One term per beat, each shown rather than described: the plan header, a task
 * row, a note, a project, and then the row-level project link that ties them
 * together. Re-checked 2026-11-22: the plan→project edge is no longer on the
 * plan detail header (its badge is commented out) or in the /plans table, so the
 * 0:41 beat films the project's own plans list instead. See the note in
 * `./episode.ts`.
 *
 * Seven flow beats, one fewer than the episode's eight, because the assembler
 * appends the outro card (`flows.test.ts` holds the count).
 */

import type { DemoFlow } from '../../runner/types.ts';
import {
  click,
  dwell,
  highlight,
  navigate,
  scrollTo,
  waitFor,
} from '../../runner/types.ts';

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
    note: '[data-testid="NotesTable"]',
    plan: '[data-testid="GlobalHeading"]',
    project: '[data-testid="ProjectsTable"]',
    relations: '[data-testid="ProjectPlansList"]',
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

    // 0:41 — how they relate, on the project just opened: the plans that point
    // at it. The /plans project column and the plan-header project badge are
    // both gone from the app (the badge is commented out in
    // PlanDetailRouteHeader), so this list is where the edge is rendered.
    waitFor('[data-testid="ProjectPlansList"]', 'relations'),
    scrollTo('[data-testid="ProjectPlansList"]'),
    dwell(700),
    highlight('[data-testid="ProjectPlansList"]', 2_000),
    dwell(2_600),

    // 0:50 — hold on the plan the short opened on.
    navigate(`/plans/${PLAN_ID}?tab=tasks`, 'hold'),
    waitFor('[data-testid="GlobalHeading"]'),
    dwell(2_600),
  ],
  title: 'Plans, tasks, notes, projects — the mental model',
};
