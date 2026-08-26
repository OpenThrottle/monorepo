/**
 * @description Flow for `docs/marketing/scripts/01-what-is-openthrottle.md` — the
 * pilot and the channel trailer.
 *
 * Opens on a seeded plan that is already in progress with its run output already
 * streamed, because the script's rule is that frame 1 shows the thing the title
 * promises. The plan id is fixed by the demo fixture, so this deep-links without a
 * lookup.
 *
 * Selectors are the app's existing DOM ids (`#plan-tab-output`, …) — the plan
 * detail tabs already carry them, so no new test hooks were added.
 */

import {
  click,
  dwell,
  highlight,
  navigate,
  scrollTo,
  waitFor,
} from '../../runner/types';
import type { DemoFlow } from '../../runner/types';

/** The rate-limiting plan from src/fixtures/demo-content.ts. */
const PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000001';

export const flow: DemoFlow = {
  id: '01-what-is-openthrottle',
  regionOfInterest: {
    hook: '[data-testid="GlobalHeading"]',
    output: '[data-testid="PlanLoggerOutput"]',
    'task-detail': '[data-testid="GlobalHeading"]',
    tasks: '#plan-tab-tasks',
    'why-it-exists': '[data-testid="MarkdownRenderer"]',
  },
  steps: [
    // 0:00 — a real plan, in progress, with its status badge in frame.
    navigate(`/plans/${PLAN_ID}`, 'hook'),
    waitFor('[data-testid="PlanStatusBadge"]'),
    dwell(1_400),

    // 0:07 — the task list: one in progress, the rest waiting.
    click('#plan-tab-tasks', 'tasks'),
    waitFor('a[href*="/tasks/"]'),
    dwell(1_800),

    // 0:15 — into a task.
    click('a[href*="/tasks/"]', 'task-detail'),
    waitFor('[data-testid="GlobalHeading"]'),
    dwell(2_000),

    // 0:24 — back to the plan, then the output stream.
    navigate(`/plans/${PLAN_ID}`, 'output'),
    click('#plan-tab-output'),
    waitFor('[data-testid="PlanLoggerOutput"]'),
    scrollTo('[data-testid="PlanLoggerOutput"]'),
    dwell(3_000),

    // 0:33 — the commit line inside the run output. NOT a commit card: the app has
    // no linked-commit surface, so the traceability is shown where it actually
    // exists. See the note in the script.
    scrollTo('text=/Committed 4f2a1c8/', 'commit-line'),
    dwell(2_600),

    // 0:41 — why the work exists at all.
    // Wait for the panel before highlighting: at the portrait viewport the tab
    // transition briefly reports no box for the target.
    click('#plan-tab-overview', 'why-it-exists'),
    waitFor('[data-testid="MarkdownRenderer"]'),
    dwell(600),
    highlight('[data-testid="MarkdownRenderer"]', 1_600),
    dwell(1_800),
  ],
  title: 'What is OpenThrottle in 60 seconds',
};
