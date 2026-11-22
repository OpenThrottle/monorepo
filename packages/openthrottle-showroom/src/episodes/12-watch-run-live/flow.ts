/**
 * @description Flow for episode `12-watch-run-live` (`./episode.ts`).
 *
 * Transcribed from the episode's beat actions, beat for beat. If the episode
 * changes, change this; if this needs a step the episode does not describe, the
 * episode is wrong.
 *
 * **Replay, on a live run.** The hero plan's run is held open by `liveRun`
 * (`scripts/demo-live-run.ts` stamps a heartbeat for the length of the take and
 * settles the run back to COMPLETED afterwards), so the plan badge reads In
 * Progress for the whole take. Nothing appends to the stream during it: the
 * output is the 19 pre-baked chunks the seed carries, and the "scrolling" is the
 * flow moving through them. No model is called.
 *
 * The seeded chunks do contain every moment the episode names: file reads and
 * writes (the tool calls), a failing test (`FAIL bucket.test.ts`), the agent's
 * fix and the same command run again (the retry), then `PASS`. They render as
 * plain log lines: the app has no tool-call widget, so a "tool call" is the line
 * that says `Writing src/…`.
 *
 * "Switch browser tabs and return" is not filmable: the runner drives one page and
 * has no tab or visibility verb. The beat is instead what the app itself shows —
 * leave the plan for the plans list, come back by a full page load, and the whole
 * stream is still there, ending on the latest line. That is also the narration's
 * claim ("stored, not tailed"), and a reload proves it more strongly than a tab
 * switch would.
 *
 * At the landscape viewport the 19 short lines may fit on one screen, so the
 * scrolling beats only visibly move in the portrait pass; `scrollTo` is a no-op
 * when the line is already in view, which is harmless.
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
  dwell,
  highlight,
  navigate,
  scrollTo,
  waitFor,
} from '../../runner/types.ts';

/** The rate-limiting plan from src/fixtures/demo-content.ts, and its hero run. */
const PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000001';
const RUN_ID = 'd0d0d0d0-0000-4000-8000-00000000ff01';

const OUTPUT_PATH = `/plans/${PLAN_ID}?tab=output`;
const OUTPUT_STREAM = '[data-testid="OutputStream"]';

/** One log line, found by text inside the stream. */
const logLine = (text: string): string => {
  return `${OUTPUT_STREAM} li:has-text("${text}")`;
};

const LINE_FIRST = logLine('Starting plan run');
const LINE_READ = logLine('Reading src/gateway/throttle/bucket.ts');
const LINE_WRITE = logLine('Writing src/gateway/throttle/bucket.ts (+94');
const LINE_FAIL = logLine('FAIL bucket.test.ts');
const LINE_FIX = logLine('Off by one');
// The same command is run twice; the second match is the retry.
const LINE_RETRY = `${logLine('pnpm test --filter atlas-api throttle')} >> nth=1`;
const LINE_PASS = logLine('PASS bucket.test.ts');
const LINE_LATEST = logLine('PASS gateway middleware');

export const flow: DemoFlow = {
  id: '12-watch-run-live',
  liveRun: { runId: RUN_ID },
  regionOfInterest: {
    failure: LINE_FAIL,
    hold: OUTPUT_STREAM,
    return: '[data-testid="PlansTable"]',
    'scroll-up': LINE_FIRST,
    stream: OUTPUT_STREAM,
    tool: LINE_WRITE,
  },
  steps: [
    // 0:00 — plan detail on the Output tab, the plan In Progress, the stream
    // filling the page. The tab is URL-synced, so the flow lands on it directly.
    navigate(OUTPUT_PATH, 'stream'),
    waitFor(OUTPUT_STREAM),
    waitFor('[data-testid="PlanStatusBadge"]'),
    dwell(900),
    highlight('[data-testid="PlanStatusBadge"]', 1_600),
    scrollTo(LINE_READ),
    dwell(1_800),

    // 0:08 — the output continues; the agent's tool calls: a read, then a write.
    waitFor(LINE_WRITE, 'tool'),
    scrollTo(LINE_WRITE),
    highlight(LINE_READ, 1_800),
    highlight(LINE_WRITE, 2_200),
    dwell(2_600),

    // 0:17 — the failing command, then the retry that passes.
    waitFor(LINE_FAIL, 'failure'),
    scrollTo(LINE_FAIL),
    highlight(LINE_FAIL, 2_600),
    highlight(LINE_FIX, 1_800),
    highlight(LINE_RETRY, 1_800),
    highlight(LINE_PASS, 2_000),
    dwell(1_400),

    // 0:27 — to the latest line, then back up to the earliest. The run is not
    // stopped or reloaded; the whole log is one scroll.
    waitFor(LINE_LATEST, 'scroll-up'),
    scrollTo(LINE_LATEST),
    dwell(2_000),
    scrollTo(LINE_FIRST),
    highlight(LINE_FIRST, 2_400),
    dwell(2_400),

    // 0:36 — leave the plan and come back; the stream is stored, not tailed.
    navigate('/plans', 'return'),
    waitFor('[data-testid="PlansTable"]'),
    dwell(900),
    navigate(OUTPUT_PATH),
    waitFor(OUTPUT_STREAM),
    scrollTo(LINE_LATEST),
    dwell(600),
    highlight(LINE_LATEST, 2_400),
    dwell(800),

    // 0:46 — hold on the stream.
    waitFor(LINE_LATEST, 'hold'),
    highlight(OUTPUT_STREAM, 2_600),
    dwell(4_200),
  ],
  title: 'Watch an agent run stream live',
};
