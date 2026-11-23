/**
 * @description Flow for episode `11-plan-run-one-task` (`./episode.ts`).
 *
 * Transcribed from the episode's beat actions, beat for beat. If the episode
 * changes, change this; if this needs a step the episode does not describe, the
 * episode is wrong.
 *
 * **Replay, on a live run.** The hero plan's run is held open by `liveRun`
 * (`scripts/demo-live-run.ts` stamps a heartbeat for the length of the take and
 * settles the run back to COMPLETED afterwards), so the plan reads In Progress
 * and cannot be swept stale mid-take. Nothing appends to the stream during the
 * take: the output is the 19 pre-baked chunks the seed carries, and no model is
 * called. Every beat shows only what those rows contain. The seeded tasks are one
 * COMPLETED, one IN_PROGRESS and one PENDING, so the episode says exactly that,
 * and the task "flip" is the log's own COMPLETED / IN_PROGRESS lines rather than
 * a transition filmed live.
 *
 * Tasks and Output are separate tabs on the plan detail page, so the flow moves
 * between them: tasks first, the log for the middle three beats, tasks again for
 * the hold. The plan toolbar is beta-gated and never touched.
 *
 * Log lines are addressed by their text (`li:has-text(…)`) under the one stable
 * hook the stream renders, `OutputStream`, because individual chunks carry no
 * test id of their own.
 *
 * Six flow beats, one fewer than the episode's seven, because the assembler
 * appends the outro card (`flows.test.ts` holds the count). The flow is read-only.
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

/** The rate-limiting plan from src/fixtures/demo-content.ts, and its hero run. */
const PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000001';
const RUN_ID = 'd0d0d0d0-0000-4000-8000-00000000ff01';

/** Its three tasks: COMPLETED, IN_PROGRESS, PENDING. */
const TASK_DONE_ID = 'd0d0d0d0-0000-4000-8000-000000000101';
const TASK_ACTIVE_ID = 'd0d0d0d0-0000-4000-8000-000000000102';
const TASK_NEXT_ID = 'd0d0d0d0-0000-4000-8000-000000000103';

const TASK_DONE = `#task-${TASK_DONE_ID}`;
const TASK_ACTIVE = `#task-${TASK_ACTIVE_ID}`;
const TASK_NEXT = `#task-${TASK_NEXT_ID}`;

const OUTPUT_STREAM = '[data-testid="OutputStream"]';

/** One log line, found by text inside the stream. */
const logLine = (text: string): string => {
  return `${OUTPUT_STREAM} li:has-text("${text}")`;
};

const LINE_TEST_PASS = logLine('PASS bucket.test.ts');
const LINE_LINT_CLEAN = logLine('pnpm lint --filter atlas-api');
const LINE_TASK_DONE = logLine('COMPLETED');
const LINE_TASK_NEXT = logLine('Task 2/3');
const LINE_COMMIT = logLine('Committed 4f2a1c8');

export const flow: DemoFlow = {
  id: '11-plan-run-one-task',
  // The run reads as live for the length of the take, and the second task is the
  // one shown IN_PROGRESS. The seed already has it so; naming it keeps the flow
  // true if the seed ever stops.
  liveRun: { runId: RUN_ID, taskId: TASK_ACTIVE_ID },
  regionOfInterest: {
    commit: LINE_COMMIT,
    complete: LINE_TASK_DONE,
    hold: TASK_ACTIVE,
    plan: TASK_ACTIVE,
    tasks: TASK_ACTIVE,
    validate: LINE_TEST_PASS,
  },
  steps: [
    // 0:00 — plan detail on the Tasks tab, the task in progress in frame. The tab
    // is URL-synced, so the flow lands on it directly.
    navigate(`/plans/${PLAN_ID}?tab=tasks`, 'plan'),
    waitFor(TASK_ACTIVE),
    dwell(1_200),
    highlight(TASK_ACTIVE, 2_200),
    dwell(2_400),

    // 0:09 — the task list: finished, in progress, waiting.
    waitFor(TASK_DONE, 'tasks'),
    highlight(TASK_DONE, 1_600),
    highlight(TASK_ACTIVE, 1_600),
    highlight(TASK_NEXT, 1_600),
    dwell(2_400),

    // 0:18 — the Output tab: the tests pass, then lint is clean.
    click('#plan-tab-output', 'validate'),
    waitFor(OUTPUT_STREAM),
    dwell(800),
    scrollTo(LINE_TEST_PASS),
    highlight(LINE_TEST_PASS, 2_400),
    highlight(LINE_LINT_CLEAN, 2_400),
    dwell(2_000),

    // 0:28 — the log closes the first task and opens the next.
    waitFor(LINE_TASK_DONE, 'complete'),
    scrollTo(LINE_TASK_DONE),
    highlight(LINE_TASK_DONE, 2_600),
    highlight(LINE_TASK_NEXT, 2_600),
    dwell(2_800),

    // 0:38 — the commit for the finished task.
    waitFor(LINE_COMMIT, 'commit'),
    scrollTo(LINE_COMMIT),
    highlight(LINE_COMMIT, 3_200),
    dwell(2_400),

    // 0:45 — back to the Tasks tab and hold: one complete, one in progress.
    click('#plan-tab-tasks', 'hold'),
    waitFor(TASK_ACTIVE),
    dwell(600),
    highlight(TASK_DONE, 1_800),
    highlight(TASK_ACTIVE, 1_800),
    dwell(3_000),
  ],
  title: 'OT Loop — run a plan one task at a time',
};
