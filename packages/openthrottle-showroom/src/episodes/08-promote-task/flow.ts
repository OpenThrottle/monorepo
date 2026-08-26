/**
 * @description Flow for `docs/marketing/scripts/08-promote-task.md`.
 *
 * Transcribed from that script's on-screen-action column, beat for beat. If the
 * script changes, change this; if this needs a step the script does not describe,
 * the script is wrong.
 *
 * What promotion actually does today (audited against the app, 2026-08): the
 * toolbar button opens a confirm dialog, the mutation ENQUEUES a BullMQ job and
 * returns — no navigation, no client-side link to the new plan. The job then
 * creates the plan (title and description carried over, one seed task titled
 * "Break down and scope this plan") and closes the source task out as SKIPPED
 * with a `promoted` tag and a plain-text "Promoted into plan <id>." summary
 * line. The script's original "the new plan opens" and "click through the link"
 * beats described a UI that does not exist; the beats were rewritten around what
 * does — see `./episode.ts`.
 *
 * Recording preconditions:
 * - The server must be running its queue workers (the default PROCESS_ROLE runs
 *   API and workers in one process) or the promotion job never executes.
 * - No OTHER server may share the recording server's Redis queues: a dev-stack
 *   worker on the same Redis steals the job and fails it against the dev
 *   database. Stop the dev stack, or give the recording server its own
 *   `OT_QUEUE_PREFIX` (this is exactly the race that env var exists for).
 * - Promotion MUTATES the demo database — the task goes SKIPPED and a new plan
 *   appears — so re-seed between takes, like every take of every flow.
 * - The waits on the new plan's row and on the provenance line are state waits:
 *   the job is asynchronous, and the dwell after the toast is pacing, not the
 *   synchronisation.
 *
 * Seven flow beats, matching the script's seven narration rows — narration is
 * matched to flow beats POSITIONALLY (assemble/timeline.ts).
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

/** The Saved-map-views plan from src/fixtures/demo-content.ts (PENDING). */
const PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000004';

/** Its overgrown task — the one the fixture wrote to be promoted on camera. */
const TASK_ID = 'd0d0d0d0-0000-4000-8000-000000000402';

/** Must match the fixture task's title: promotion names the new plan after it. */
const PROMOTED_TITLE = 'Share saved views across the team';

/** The server's SEED_TASK_TITLE — the one task a promoted plan starts with. */
const SEED_TASK_TITLE = 'Break down and scope this plan';

export const flow: DemoFlow = {
  id: '08-promote-task',
  // Detail pages and the plans table are wider than the portrait crop window;
  // cropping them clips text at both edges. Fit and letterbox instead.
  portraitStrategy: 'fit',
  regionOfInterest: {
    breakdown: '[data-testid="GlobalHeading"]',
    hook: '[data-testid="GlobalHeading"]',
    intact: '[data-testid="TaskDetails"]',
    'new-plan': '[data-testid="GlobalHeading"]',
    promote: '[data-testid="PlanTaskToolbar"]',
    record: '[data-testid="TaskDetails"]',
    scroll: '[data-testid="TaskDetails"]',
  },
  steps: [
    // 0:00 — the task that is clearly five tasks.
    navigate(`/plans/${PLAN_ID}/tasks/${TASK_ID}`, 'hook'),
    waitFor('[data-testid="TaskDetails"]'),
    dwell(1_800),

    // 0:08 — scroll the description; the numbered list is the evidence.
    scrollTo('text=/independently shippable/', 'scroll'),
    dwell(3_600),

    // 0:16 — promote. Button, confirm dialog, and the queued toast.
    scrollTo('[data-testid="PlanTaskToolbar"]'),
    click('[aria-label="Promote to Plan"]', 'promote'),
    waitFor('[role="alertdialog"]'),
    dwell(1_200),
    click('[role="alertdialog"] >> text="Promote"'),
    waitFor('text=/Promotion queued/'),
    dwell(2_400),

    // 0:21 — the task became a plan. The list orders createdAt DESC, so the new
    // plan is the top row; the wait is on its title because the job is async.
    navigate('/plans', 'new-plan'),
    waitFor(`[data-testid="PlansTable"] >> text="${PROMOTED_TITLE}"`),
    dwell(800),
    click(
      `[data-testid="PlansTable"] a[href^="/plans/"]:has-text("${PROMOTED_TITLE}")`,
    ),
    // The default tab is the overview — which is the beat: the carried-over
    // description, rendered on the new plan.
    waitFor('[data-testid="MarkdownRenderer"]'),
    dwell(3_200),

    // 0:31 — the original task: SKIPPED, tagged, and a note naming the new plan.
    navigate(`/plans/${PLAN_ID}/tasks/${TASK_ID}`, 'record'),
    waitFor('text=/Promoted into plan/'),
    dwell(2_800),

    // 0:41 — nothing lost, nothing duplicated: the provenance line, up close.
    highlight('text=/Promoted into plan/', 2_000, 'intact'),
    dwell(2_600),

    // 0:48 — back on the new plan, the seed task is already waiting: break the
    // work down properly.
    navigate('/plans', 'breakdown'),
    waitFor(`[data-testid="PlansTable"] >> text="${PROMOTED_TITLE}"`),
    click(
      `[data-testid="PlansTable"] a[href^="/plans/"]:has-text("${PROMOTED_TITLE}")`,
    ),
    waitFor('#plan-tab-tasks'),
    click('#plan-tab-tasks'),
    waitFor(`text="${SEED_TASK_TITLE}"`),
    highlight(`text="${SEED_TASK_TITLE}"`, 1_600),
    dwell(2_200),
  ],
  title: 'Promote a task into its own plan',
};
