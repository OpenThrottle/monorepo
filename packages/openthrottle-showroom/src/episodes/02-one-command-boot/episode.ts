/**
 * @description Episode 02-one-command-boot — 0 to 60 — boot the whole stack with one command
 *
 * Migrated verbatim from `docs/marketing/scripts/02-one-command-boot.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * A terminal video, not an app video. The script originally asked for a split
 * frame — terminal left, browser right — but the recorder is one chromium page, so
 * the flow uses a typeset terminal surface for the first five beats (the 05
 * pattern; see `./surface.ts`) and cuts to the real dashboard at 0:39. The beat
 * actions below describe that version.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action: 'Empty terminal prompt. Type `./scripts/setup.sh`.',
      t: '0:00',
    },
    {
      action: 'Setup output scrolls; hold on the docker compose lines.',
      t: '0:08',
    },
    { action: 'Output reaches the seeded-user line.', t: '0:18' },
    { action: 'Type `pnpm run start` in the same terminal.', t: '0:26' },
    {
      action: 'Server boot lines scroll; port six-oh-two-one appears.',
      t: '0:31',
    },
    {
      action:
        'Cut to the dashboard, authenticated, seeded data already visible.',
      t: '0:39',
    },
    { action: 'Hold on the dashboard.', t: '0:48' },
    { action: 'Outro card.', t: '0:53' },
  ],
  format: 'short',
  id: '02-one-command-boot',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Boot the stack', 'with one command'],
  },
  release: { order: 3, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '0:00',
          'One command. Postgres, Redis, the API, the dashboard, and a seeded login.',
        ],
        [
          '0:08',
          'It brings up the database and Redis in Docker, then applies every pending migration.',
        ],
        [
          '0:18',
          'It seeds a user, so you are not stuck at a login screen with no account.',
        ],
        ['0:26', 'Then start it.'],
        [
          '0:31',
          'The API comes up first. The dashboard waits for it, then follows.',
        ],
        [
          '0:39',
          'And that is the whole thing running. No cloud account, no API key, no signup.',
        ],
        ['0:48', 'Everything after this point happens on your machine.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'developer tools',
      'monorepo',
      'open source',
      'devex',
    ],
    title: '0 to 60 — boot the whole stack with one command',
  },
};
