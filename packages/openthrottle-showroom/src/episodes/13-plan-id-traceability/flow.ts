/**
 * @description Flow for episode `13-plan-id-traceability` (`./episode.ts`).
 *
 * Transcribed from the episode's beat actions, beat for beat. If the episode
 * changes, change this; if this needs a step the episode does not describe, the
 * episode is wrong.
 *
 * Three beats are a terminal (`./surface.ts`, a typeset shell, because the
 * recorder cannot film a real one) and four are the product. The hand-off is the
 * header commander: focusing the header search opens `OpenThrottleCommander`, and
 * a pasted task UUID resolves to an "Open task" row that Enter follows to
 * `/plans/<planId>/tasks/<taskId>`. That is the id-jump, not the `/search` page.
 *
 * "Copy the task id" has no clipboard verb to run, and the flow adds none. The
 * honest equivalent: highlight the footer on the surface (the copy beat), then
 * `type_` the same id, read from the same constant the frame is built from, into
 * the commander. The viewer sees the id selected and the id arrive; nothing is
 * pasted for real.
 *
 * Only hooks the app really renders are used, and none is beta-gated (the task
 * toolbar is, so the flow never touches it).
 *
 * Seven flow beats, one fewer than the episode's eight, because the assembler
 * appends the outro card (`flows.test.ts` holds the count). The flow is read-only.
 */

import type { DemoFlow } from '../../runner/types.ts';
import {
  click,
  dwell,
  highlight,
  navigate,
  press,
  reveal,
  stage,
  type_,
  waitFor,
  waitForUrl,
  zoomTo,
} from '../../runner/types.ts';
import {
  PLAN_ID_TRACEABILITY,
  PLAN_ID_TRACEABILITY_SURFACES,
} from './surface.ts';

const COMMANDER_INPUT = '[data-testid="OpenThrottleCommander"] input';

/** The plan description sits under the Summary heading and its rule. */
const PLAN_DESCRIPTION = 'hr + [data-testid="MarkdownRenderer"]';

export const flow: DemoFlow = {
  id: '13-plan-id-traceability',
  // A shell window is narrower than the viewport with type sized for a phone, and
  // the app beats each point their region at one block, so the crop reads well.
  portraitStrategy: 'crop',
  regionOfInterest: {
    copy: '#log-footer',
    hold: PLAN_DESCRIPTION,
    log: '#log-command',
    paste: '[data-testid="GlobalLayoutHeaderSearch"]',
    plan: '[data-testid="GlobalHeading"]',
    task: '[data-testid="TaskDetails"]',
    zoom: '#log-footer',
  },
  steps: [
    // 0:00 — the terminal; `git log -1` typed and run, the commit and its footer.
    stage('terminal', 'log'),
    waitFor('#log-command'),
    dwell(150),
    type_('#log-command', PLAN_ID_TRACEABILITY.command, 'log'),
    press('Enter'),
    reveal('#log-output'),
    dwell(5_000),

    // 0:07 — zoom on the two footer lines.
    waitFor('#log-footer', 'zoom'),
    zoomTo('#log-footer', 1.3),
    dwell(5_500),

    // 0:15 — copy the task id. No clipboard verb exists, so the footer is
    // highlighted (the two ids sit on adjacent lines) and the next beat types
    // the same id.
    waitFor('#log-footer', 'copy'),
    highlight('#log-footer', 2_200),
    dwell(2_800),

    // 0:21 — paste into the header commander; the task opens. Focusing the
    // header search opens the palette, the typed UUID resolves to an "Open task"
    // row (its status badge is the signal the lookup finished), and Enter takes it.
    navigate('/dashboard', 'paste'),
    waitFor('[data-testid="GlobalLayoutHeaderSearch"] input'),
    click('[data-testid="GlobalLayoutHeaderSearch"] input'),
    waitFor('[data-testid="OpenThrottleCommander"]'),
    type_(COMMANDER_INPUT, PLAN_ID_TRACEABILITY.taskId),
    waitFor('[data-testid="CommanderItemRow-trailing"]'),
    dwell(900),
    press('Enter'),
    waitForUrl(
      `**/plans/${PLAN_ID_TRACEABILITY.planId}/tasks/${PLAN_ID_TRACEABILITY.taskId}**`,
    ),

    // 0:28 — task detail: title, status, description and the link to its plan.
    waitFor('[data-testid="TaskDetails"]', 'task'),
    waitFor('[data-testid="PlanStatusBadge"]'),
    dwell(600),
    highlight('[data-testid="GlobalHeading"]', 1_600),
    highlight('[data-testid="PlanStatusBadge"]', 1_400),
    highlight('[data-testid="TaskDetails"]', 2_200),
    dwell(2_000),

    // 0:37 — up to the plan, by the task's own "View plan" link.
    click(
      `[data-testid="TaskDetails"] a[href="/plans/${PLAN_ID_TRACEABILITY.planId}"]`,
      'plan',
    ),
    waitFor(PLAN_DESCRIPTION),
    dwell(600),
    highlight(PLAN_DESCRIPTION, 2_400),
    dwell(5_000),

    // 0:46 — hold on the plan description.
    highlight(PLAN_DESCRIPTION, 2_500, 'hold'),
    dwell(4_500),
  ],
  surfaces: PLAN_ID_TRACEABILITY_SURFACES,
  title: 'Every commit, traced to its task',
};
