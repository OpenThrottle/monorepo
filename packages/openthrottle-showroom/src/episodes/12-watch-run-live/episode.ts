/**
 * @description Episode 12-watch-run-live — Watch an agent run stream live
 *
 * Migrated verbatim from `docs/marketing/scripts/12-watch-run-live.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * **Replay.** Same treatment as 11. The stream must look alive, so the assembly
 * stage must not drop frames here — the scroll is the content.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action: 'Plan detail with the output stream actively scrolling.',
      t: '0:00',
    },
    { action: 'Output continues; a tool call appears.', t: '0:08' },
    {
      action: 'A failing command appears in the stream, then a retry.',
      t: '0:17',
    },
    { action: 'Scroll up in the stream to earlier output.', t: '0:27' },
    {
      action: 'Switch browser tabs and return; the stream is still current.',
      t: '0:36',
    },
    { action: 'Hold on the streaming output.', t: '0:46' },
    { action: 'Outro card.', t: '0:54' },
  ],
  dataRequirements: [
    {
      atLeast: 15,
      describe: 'the hero run output chunks, which the replay flow scrolls',
      sql: `SELECT count(*) AS value FROM plan_output_stream WHERE plan_id = (SELECT plan_id FROM plan_runs WHERE id = 'd0d0d0d0-0000-4000-8000-00000000ff01')`,
    },
    {
      atLeast: 1,
      describe:
        'the hero run itself, still COMPLETED so the badge cannot change between takes',
      sql: `SELECT count(*) AS value FROM plan_runs WHERE id = 'd0d0d0d0-0000-4000-8000-00000000ff01' AND status = 'COMPLETED'`,
    },
  ],
  format: 'short',
  id: '12-watch-run-live',
  production: {
    blockedOn: [],
    recording: 'replay',
    titleCard: ['Watch the run', 'stream live'],
  },
  release: { order: 19, playlist: 'execution', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'This is an agent working, right now, on my machine.'],
        ['0:08', 'Every line it writes lands here as it happens. Not after.'],
        ['0:17', 'Including the parts that go wrong. That is the useful half.'],
        [
          '0:27',
          'You can scroll back through the whole run without stopping it.',
        ],
        [
          '0:36',
          'Close the tab and come back. It is still there, because it is stored, not tailed.',
        ],
        [
          '0:46',
          'No log files, no attaching to a terminal, no guessing what it is doing.',
        ],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'observability',
      'developer tools',
      'open source',
    ],
    title: 'Watch an agent run stream live',
  },
};
