/**
 * @description Episode 19-skills — Skills — teach your agents your house rules
 *
 * Migrated verbatim from `docs/marketing/scripts/19-skills.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 *
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action: '`/skills` with the catalogue listed, one skill open in detail.',
      t: '0:00',
    },
    {
      action: "Scroll the skill's body — a short procedure with commands.",
      t: '0:09',
    },
    { action: "Show the skill's trigger description.", t: '0:19' },
    {
      action: 'Switch to the composer; type a request the skill covers.',
      t: '0:28',
    },
    { action: "The response follows the skill's procedure.", t: '0:36' },
    {
      action: 'Back to `/skills`; show the availability rules on the skill.',
      t: '0:45',
    },
    { action: 'Outro card.', t: '0:53' },
  ],
  dataRequirements: [
    {
      atLeast: 8,
      describe:
        'distinct skills with recorded usage, so the catalogue is not empty',
      sql: `SELECT count(DISTINCT skill_name) AS value FROM skill_usage_events`,
    },
    {
      atLeast: 100,
      describe: 'skill usage events behind the usage counts',
      sql: `SELECT count(*) AS value FROM skill_usage_events`,
    },
  ],
  format: 'short',
  id: '19-skills',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Teach agents', 'your house rules'],
  },
  release: { order: 13, playlist: 'interfaces-and-dx', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', "Every team has rules. Most of them live in someone's head."],
        [
          '0:09',
          'A skill is those rules written down once, in a file your agents read.',
        ],
        [
          '0:19',
          'It says when to use itself. So the agent picks it up without being told.',
        ],
        ['0:28', 'Ask for something the skill covers.'],
        ['0:36', 'And it follows your procedure instead of inventing one.'],
        ['0:45', 'You control where each one applies. Per project, per tag.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'claude code',
      'developer tools',
      'open source',
    ],
    title: 'Skills — teach your agents your house rules',
  },
};
