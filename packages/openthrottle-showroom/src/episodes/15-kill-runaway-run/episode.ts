/**
 * @description Episode 15-kill-runaway-run — Kill a runaway agent run
 *
 * Migrated verbatim from `docs/marketing/scripts/15-kill-runaway-run.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * Originally written around a graceful **Cancel** as well as **Kill**, and marked
 * blocked because of it. Checking the app settled it: **Kill run** ships and is right
 * there on the plan toolbar and in the plans table; a graceful cancel — stop at the
 * next checkpoint, return the task to pending — does not exist. The app's own copy
 * says so ("Unavailable while a run is active — kill the run first").
 *
 * So this video is now kill-only, which is true, and the graceful-cancel half is a
 * future video that lands when the feature does. **Do not put cancel back into this
 * script until there is a control to point at.**
 *
 * **Replay.** The stuck run is seeded, not produced live.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'Plan detail, run active, output looping on the same failing command.',
      t: '0:00',
    },
    { action: 'Scroll the repeating output.', t: '0:09' },
    {
      action: 'Highlight the disabled toolbar actions and their tooltip.',
      t: '0:18',
    },
    { action: 'Click **Kill run**.', t: '0:27' },
    { action: 'The run ends; the toolbar actions come back.', t: '0:34' },
    {
      action: "Open the run's output; the partial output is still there.",
      t: '0:42',
    },
    { action: 'Hold on the partial output.', t: '0:51' },
    { action: 'Outro card.', t: '0:56' },
  ],
  format: 'short',
  id: '15-kill-runaway-run',
  production: {
    blockedOn: [
      'The plan toolbar is not rendered — PlanDetailRoute hard-codes `const showToolbar = false` (landed in #452, 2026-08-28), so Kill run, the disabled run actions and their tooltips are all absent from the page this episode is about',
    ],
    recording: 'replay',
    titleCard: ['Kill a runaway', 'agent run'],
  },
  release: { order: 24, playlist: 'execution', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '0:00',
          'This one is stuck. It has retried the same thing eleven times.',
        ],
        [
          '0:09',
          'An agent that cannot tell it is looping will loop until you stop it.',
        ],
        [
          '0:18',
          'While a run is active, the rest of the plan is locked. That is on purpose.',
        ],
        ['0:27', 'So kill it. There is one button and it does not negotiate.'],
        ['0:34', 'The process is gone and the plan is yours again.'],
        [
          '0:42',
          'The output it produced is kept, so you can see how far it got and why it stalled.',
        ],
        ['0:51', 'Then fix the task and run it again.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'reliability',
      'developer tools',
      'open source',
    ],
    title: 'Kill a runaway agent run',
  },
};
