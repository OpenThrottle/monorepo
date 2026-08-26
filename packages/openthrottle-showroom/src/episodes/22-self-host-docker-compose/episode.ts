/**
 * @description Episode 22-self-host-docker-compose — Self-host the whole thing on one box
 *
 * Migrated verbatim from `docs/marketing/scripts/22-self-host-docker-compose.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * Terminal, then browser. The compose file shown must be the committed one — do not
 * edit it for the shot.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'Browser showing the running dashboard, then cut to the terminal behind it.',
      t: '0:00',
    },
    {
      action: 'Open the committed compose file; scroll the service list.',
      t: '0:09',
    },
    {
      action: 'Run the compose up command with the production profile.',
      t: '0:19',
    },
    { action: 'Containers start; health checks go green.', t: '0:27' },
    { action: 'Browser loads the dashboard on the served port.', t: '0:37' },
    { action: 'Hold on the dashboard.', t: '0:46' },
    { action: 'Outro card.', t: '0:54' },
  ],
  format: 'short',
  id: '22-self-host-docker-compose',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Self-host it', 'on one box'],
  },
  release: { order: 21, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'This is running in Docker. One box, one file.'],
        [
          '0:09',
          'The database, Redis, the API, the dashboard, and the MCP server.',
        ],
        ['0:19', 'One command brings all of it up.'],
        [
          '0:27',
          'It waits for the database, applies migrations, then starts serving.',
        ],
        [
          '0:37',
          'And that is your own instance. Your data, your machine, your network.',
        ],
        [
          '0:46',
          'Apache two licensed. No hosted account involved at any point.',
        ],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'docker',
      'self hosting',
      'open source',
      'developer tools',
    ],
    title: 'Self-host the whole thing on one box',
  },
};
