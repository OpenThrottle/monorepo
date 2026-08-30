/**
 * @description Copy me. A worked skeleton for a new episode flow, with the
 * conventions from `AUTHORING_FLOWS.md` in place rather than described.
 *
 * Not registered in `../flows.ts` and not an episode, so nothing records it and
 * the flow gate ignores it. It still typechecks and lints, which is the point —
 * a template that has drifted out of the type is worse than no template.
 *
 * To use it: copy this file to `../<episode-id>/flow.ts`, add one line to
 * `../flows.ts`, then work down the episode's beats replacing each block. Delete
 * every comment that is still describing the template rather than your video.
 *
 * Read `../../RECORDABILITY.md` for your episode BEFORE you start. Several beats
 * that look ordinary are not recordable — a stubbed route, a form field that
 * does not exist, a page that reflects the recording host rather than the seed —
 * and the audit says which.
 */

import {
  click,
  dwell,
  highlight,
  navigate,
  scrollTo,
  type_,
  waitFor,
} from '../../runner/types';
import type { DemoFlow } from '../../runner/types';

/**
 * Deep-linked ids come from the hero fixture (`src/fixtures/demo-content.ts`),
 * whose `d0d0d0d0-` ids are stable by construction. Do NOT pin an imported
 * snapshot id: the next refresh silently breaks it. When the beat only needs a
 * SHAPE — "a task with a description long enough to scroll" — express that as a
 * `dataRequirement` on the episode and reach the row by navigation instead.
 */
const PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000001';

export const flow: DemoFlow = {
  // Same slug as the episode directory and the episode module. One slug names
  // the module, the flow and the output directory; the gate enforces it.
  id: '_template',

  // `fit` for tables, full-page forms and whole dashboards — cropping those
  // clips text at both edges and no choice of centre saves it. `crop` (the
  // default) for a field, a button or a single card. If most beats want `crop`
  // and one is a table, keep `crop` and give that beat a region of interest
  // pointing at the table — that is what 05 does.
  portraitStrategy: 'fit',

  // One key per beat you want framed. A beat with no entry falls back to centre
  // framing, which loses the sidebar and half the content of a 1920-wide page.
  //
  // A typing beat crops to the FIELD, not the page: a full-width form at
  // portrait width is unreadable text at 20% scale.
  //
  // Every key here must be a beat some step actually labels — the gate fails on
  // a region nobody enters, because run.ts would only tell you after a take.
  regionOfInterest: {
    detail: '[data-testid="MarkdownRenderer"]',
    hook: '[data-testid="GlobalHeading"]',
    output: '[data-testid="PlanLoggerOutput"]',
    'type-title': '#plan-title',
  },

  steps: [
    // 0:00 — frame 1 shows the thing the title promises. Open on the payoff, not
    // on an empty state and not on a spinner: `navigate` then `waitFor` the
    // element that proves the page has content, then a SHORT dwell.
    navigate(`/plans/${PLAN_ID}`, 'hook'),
    waitFor('[data-testid="PlanStatusBadge"]'),
    dwell(1_200),

    // 0:08 — a beat that changes what is on screen. `waitFor` before `highlight`,
    // always: after a tab switch or a skeleton swap the target briefly reports no
    // bounding box at the portrait viewport, and a highlight on a box-less
    // element is silently missing — along with the beat's region sample.
    click('#plan-tab-overview', 'detail'),
    waitFor('[data-testid="MarkdownRenderer"]'),
    dwell(600),
    highlight('[data-testid="MarkdownRenderer"]', 1_600),
    dwell(1_400),

    // 0:17 — a typing beat. The step's `beat` label is what opens the beat;
    // unlabelled steps after it continue the same one, which is how a beat can be
    // several steps without becoming several beats.
    type_('#plan-title', 'Add rate limiting to the public API', 'type-title'),
    dwell(700),

    // 0:25 — never reach for a longer `dwell` because something is not ready.
    // Waits are on app state so a slow machine stretches the recording instead of
    // desynchronising it; `dwell` is pacing for the narration and nothing else.
    // There is deliberately no `sleep` verb.
    scrollTo('[data-testid="PlanLoggerOutput"]', 'output'),
    dwell(2_400),

    // Your last beat is the episode's LAST-BUT-ONE. The outro card is appended by
    // the assembler, identically on every video, and is never recorded.
  ],

  title: 'Template — copy this, do not record it',
};
