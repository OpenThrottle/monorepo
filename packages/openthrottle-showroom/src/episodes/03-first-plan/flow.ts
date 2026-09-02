/**
 * @description Flow for `docs/marketing/scripts/03-first-plan.md`.
 *
 * Transcribed from that script's on-screen-action column, beat for beat. If the
 * script changes, change this; if this needs a step the script does not describe,
 * the script is wrong.
 *
 * Selectors are the same hooks the Maestro E2E flows use (`#plan-title`,
 * `#plan-submit-button`, `[data-testid="PlansTable"]`). The app must not grow a
 * second parallel set of test hooks.
 */

import {
  click,
  dwell,
  navigate,
  select,
  type_,
  waitFor,
} from '../../runner/types';
import type { DemoFlow } from '../../runner/types';

export const flow: DemoFlow = {
  id: '03-first-plan',
  // Creates a plan on camera, so take 1 leaves it in the list take 2 opens on.
  // The recorder refuses a second take without a re-seed; see runner/dirty.ts.
  mutates: true,
  // Tables and full-page forms are wider than the portrait crop window; cropping
  // them clips text at both edges. Fit and letterbox instead.
  portraitStrategy: 'fit',
  regionOfInterest: {
    // Typing beats crop to the field, not the page: a 1080-wide portrait frame of
    // a full-width form is unreadable text at 20% scale.
    'create-plan': '[data-testid="PlanForm"]',
    hook: '[data-testid="PlansTable"]',
    payoff: '[data-testid="PlansTable"]',
    'pick-category': '[data-testid="PlanForm"]',
    'type-description': '#plan-summary',
    'type-title': '#plan-title',
  },
  steps: [
    // 0:00 — open on the payoff: a populated plans list, not an empty state.
    navigate('/plans', 'hook'),
    waitFor('[data-testid="PlansTable"]'),
    dwell(900),

    // 0:06 — start a new plan.
    click(
      '[data-testid="PlansToolbar"] a[href="/plans/create"]',
      'create-plan',
    ),
    waitFor('#plan-title'),
    dwell(500),

    // 0:06 — the title.
    type_('#plan-title', 'Add rate limiting to the public API', 'type-title'),
    dwell(600),

    // 0:14 — the category. Not in the first draft of the script: the app requires
    // it and has no default, so the script gained a beat rather than the flow
    // pretending the field is not there.
    select('#plan-category-trigger', 'feature', 'pick-category'),
    dwell(600),

    // 0:20 — the why.
    type_(
      '#plan-summary',
      'Protect the public endpoints from bursts.',
      'type-description',
    ),
    dwell(700),

    // 0:24 — save, land on the new plan.
    click('#plan-submit-button', 'save'),
    waitFor('[data-testid="GlobalHeading"]'),
    dwell(1_400),

    // 0:49 — the plan in the list.
    navigate('/plans', 'payoff'),
    waitFor('[data-testid="PlansTable"]'),
    dwell(1_800),
  ],
  title: 'Your first plan in 60 seconds',
};
