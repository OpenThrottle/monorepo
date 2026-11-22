/**
 * @description Flow for episode `03-first-plan` (`./episode.ts`).
 *
 * Transcribed from the episode's beat actions, beat for beat. If the episode
 * changes, change this; if this needs a step the episode does not describe, the
 * episode is wrong.
 *
 * The first five beats are the agent session, typeset (`./surface.ts`) the way 05
 * and 02 do it, because the recorder cannot make a live MCP call. The last two are
 * the product: the plan those calls wrote, on its Tasks tab, with the tasks in
 * order. The plan is pre-seeded, so the flow reads and never writes — which is why
 * it is not `mutates`.
 *
 * Seven flow beats, one fewer than the episode's eight, because the assembler
 * appends the outro card (`flows.test.ts` holds the count).
 */

import type { DemoFlow } from '../../runner/types.ts';
import {
  dwell,
  highlight,
  navigate,
  press,
  reveal,
  scrollTo,
  stage,
  type_,
  waitFor,
} from '../../runner/types.ts';
import { FIRST_PLAN, FIRST_PLAN_SURFACES } from './surface.ts';

export const flow: DemoFlow = {
  id: '03-first-plan',
  // The session is a window narrower than the viewport with type sized for a phone,
  // so it crops well. The two app beats point their region at one heading and one
  // row, which the crop then centres on.
  portraitStrategy: 'crop',
  regionOfInterest: {
    ask: '#ask',
    'create-plan': '#plan-args',
    'create-tasks': '#tasks-args',
    'in-order': `#task-${FIRST_PLAN.firstTaskId}`,
    'in-the-app': '[data-testid="GlobalHeading"]',
    'plan-id': '#plan-result',
    'tasks-created': '#tasks-result',
  },
  steps: [
    // 0:00 — an empty prompt, and the request typed into it.
    stage('agent', 'ask'),
    waitFor('#ask-command'),
    dwell(150),
    type_('#ask-command', FIRST_PLAN.prompt, 'ask'),
    press('Enter'),
    dwell(1_300),

    // 0:07 — the first tool call, with its arguments.
    reveal('#plan-call', 'create-plan'),
    scrollTo('#plan-call'),
    dwell(1_500),
    highlight('#plan-args', 2_000),
    dwell(3_000),

    // 0:14 — what it hands back: the id the next call needs.
    reveal('#plan-result', 'plan-id'),
    scrollTo('#plan-result'),
    highlight('#plan-result', 1_800),
    dwell(3_200),

    // 0:19 — the second call, carrying that id and the tasks in order.
    reveal('#tasks-call', 'create-tasks'),
    scrollTo('#tasks-call'),
    dwell(2_500),
    highlight('#tasks-args', 2_500),
    dwell(4_000),

    // 0:28 — all three created in one call.
    reveal('#tasks-result', 'tasks-created'),
    scrollTo('#tasks-result'),
    highlight('#tasks-result', 1_800),
    dwell(4_200),

    // 0:34 — the cut to the product: the plan itself, on its Tasks tab. The tab is
    // URL-synced, so the flow lands on it directly instead of clicking through.
    navigate(`/plans/${FIRST_PLAN.planId}?tab=tasks`, 'in-the-app'),
    waitFor(`#task-${FIRST_PLAN.firstTaskId}`),
    dwell(2_000),
    highlight('[data-testid="GlobalHeading"]', 2_000),
    dwell(5_800),

    // 0:44 — the tasks, first to last, in the order the agent gave them.
    highlight(`#task-${FIRST_PLAN.firstTaskId}`, 1_800, 'in-order'),
    dwell(1_700),
    highlight(`#task-${FIRST_PLAN.lastTaskId}`, 1_800),
    dwell(3_500),
  ],
  surfaces: FIRST_PLAN_SURFACES,
  title: 'Your first plan in 60 seconds',
};
