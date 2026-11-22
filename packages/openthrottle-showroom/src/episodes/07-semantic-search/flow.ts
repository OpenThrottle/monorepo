/**
 * @description Flow for episode `07-semantic-search` (`./episode.ts`).
 *
 * Transcribed from the episode's beat actions, beat for beat. If the episode
 * changes, change this; if this needs a step the episode does not describe, the
 * episode is wrong.
 *
 * `/search` is the app's own results page, reachable with
 * `FEATURE_BETA_PREVIEW` off. The query embeds locally, so both searches
 * return the same results on every take (checked 2026-11-22 against the
 * regenerated snapshot: ten cards per query, identical across two runs).
 *
 * Clearing the field is select-all plus Backspace, then the new query is typed
 * and submitted with Enter: the toolbar is a plain GET form, so the reveal is
 * a real navigation rather than a client-side filter. The top result for the
 * retries query is a task, and its card links to its plan at that task
 * (`/plans/<id>#task-<id>`), which is the "plan from months ago" beat 4 opens.
 *
 * Six flow beats, one fewer than the episode's seven, because the assembler
 * appends the outro card (`flows.test.ts` holds the count).
 */

import type { DemoFlow } from '../../runner/types.ts';
import {
  click,
  dwell,
  highlight,
  navigate,
  press,
  type_,
  waitFor,
  waitForUrl,
} from '../../runner/types.ts';

const SEARCH_INPUT = '[data-testid="SearchToolbar-form"] input[name="q"]';

/** The runner resolves every selector to its first match, so this is the top card. */
const FIRST_CARD = '[data-testid="SearchCard"]';

export const flow: DemoFlow = {
  id: '07-semantic-search',
  // Result cards are full-width rows; cropping them clips the titles at both
  // edges. Fit and letterbox, as 04 does for tables.
  portraitStrategy: 'fit',
  regionOfInterest: {
    hold: '[data-testid="GlobalHeading"]',
    hook: '[data-testid="SearchCard"]',
    open: '[data-testid="GlobalHeading"]',
    query: '[data-testid="SearchToolbar-form"]',
    reason: FIRST_CARD,
    results: '[data-testid="SearchCard"]',
  },
  steps: [
    // 0:00 — /search already showing results for `rate limiting`.
    navigate('/search?q=rate%20limiting', 'hook'),
    waitFor('[data-testid="SearchCard"]'),
    dwell(5_000),

    // 0:08 — clear the field; describe the problem instead of naming it.
    click(SEARCH_INPUT, 'query'),
    press('ControlOrMeta+A'),
    press('Backspace'),
    type_(SEARCH_INPUT, 'how did we handle retries'),
    dwell(400),
    press('Enter'),
    // The toolbar is a GET form, so Enter is a full-document load: wait for it
    // here, inside the beat, so the hide stylesheet is back before the beat ends.
    waitForUrl('**/search?q=how*'),

    // 0:18 — the results, none of which contain the phrase.
    waitFor('[data-testid="SearchCard"]', 'results'),
    dwell(6_000),

    // 0:27 — the top result's relevance, printed on its card.
    waitFor(`${FIRST_CARD} [data-testid="SearchCard-relevance"]`, 'reason'),
    highlight(`${FIRST_CARD} [data-testid="SearchCard-relevance"]`, 2_400),
    dwell(4_000),

    // 0:36 — open it: the plan, at the task that matched.
    click(`${FIRST_CARD} a`, 'open'),
    waitFor('[data-testid="GlobalHeading"]'),
    dwell(6_500),

    // 0:46 — hold on the plan description.
    dwell(6_000, 'hold'),
  ],
  title: 'Semantic search across every plan you have ever written',
};
