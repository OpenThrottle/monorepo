/**
 * @description Episode 20-generators — Generators — stop hand-writing components
 *
 * Migrated verbatim from `docs/marketing/scripts/20-generators.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 *
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'A freshly generated component file open, correct structure and imports.',
      t: '0:00',
    },
    {
      action:
        'Navigate to `/generators`; the catalogue lists what is available.',
      t: '0:08',
    },
    {
      action: 'Open the react-router generator; the option form renders.',
      t: '0:16',
    },
    { action: 'Fill in the app, folder and component name.', t: '0:26' },
    { action: 'Run it; the created file paths list out.', t: '0:35' },
    { action: 'Open the generated test file.', t: '0:44' },
    { action: 'Hold on the file tree.', t: '0:51' },
    { action: 'Outro card.', t: '0:56' },
  ],
  format: 'short',
  id: '20-generators',
  production: {
    blockedOn: [
      '/generators is gated behind FEATURE_BETA_PREVIEW (authMiddleware BETA_ROUTE_PREFIXES) and renders the "may not function as expected" beta banner when the flag is on',
      'The generator detail page is documentation, presets and schema tabs — there is no option form and no run control ("Run Nx from your clone of OpenThrottle"), so three of the seven beats have no control behind them',
    ],
    recording: 'live',
    titleCard: ['Stop hand-writing', 'components'],
  },
  release: { order: 17, playlist: 'interfaces-and-dx', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'Nobody typed this file. It took two seconds.'],
        ['0:08', 'The dashboard knows every generator this repo has.'],
        [
          '0:16',
          'Pick one and it shows you the options, so you are not reading a help flag.',
        ],
        ['0:26', 'Say where it goes and what it is called.'],
        [
          '0:35',
          'Run it, and you get the file, the test, and the index export.',
        ],
        ['0:44', 'Including a test, which is the part everyone skips.'],
        ['0:51', 'Same shape every time. That is the whole point.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'nx',
      'monorepo',
      'code generation',
      'developer tools',
    ],
    title: 'Generators — stop hand-writing components',
  },
};
