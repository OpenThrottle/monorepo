/**
 * @description Episode 21-dashboard-tour — The dashboard tour in 60 seconds
 *
 * Migrated verbatim from `docs/marketing/scripts/21-dashboard-tour.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * The highest risk of turning into a list read aloud. Rule for this one: **six stops,
 * no more**, and each stop shows one thing you can do there.
 *
 * The search stop uses the **header search**, which opens the commander — not the
 * `/search` route, which currently redirects to `/dashboard` in a production build
 * (see `07-semantic-search.md`). The commander is the app's real search entry point,
 * so the stop is honest either way.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action: '`/dashboard` with seeded activity, charts populated.',
      t: '0:00',
    },
    { action: 'Point at the activity panel.', t: '0:06' },
    { action: 'Click **Plans**; the list loads.', t: '0:14' },
    { action: 'Click **Schedule**; jobs list loads.', t: '0:22' },
    { action: 'Click **Search**; type half a thought.', t: '0:30' },
    { action: 'Click **Skills**; catalogue loads.', t: '0:39' },
    { action: 'Click **Settings**; show the models section.', t: '0:47' },
    { action: 'Outro card.', t: '0:54' },
  ],
  dataRequirements: [
    {
      atLeast: 100,
      describe:
        'plans across the whole tour, the number the dashboard counter shows',
      sql: `SELECT count(*) AS value FROM plans`,
    },
    {
      atLeast: 14,
      describe:
        'days of activity so the dashboard chart has a shape, not a spike',
      sql: `SELECT count(*) AS value FROM daily_stats`,
    },
    {
      atLeast: 50,
      describe:
        'completed plans, so the status breakdown is dominated by real work',
      sql: `SELECT count(*) AS value FROM plans WHERE status = 'COMPLETED'`,
    },
    {
      atLeast: 500,
      describe: 'tasks behind the plans the tour opens',
      sql: `SELECT count(*) AS value FROM tasks`,
    },
    {
      atLeast: 5,
      describe: 'scheduled jobs for the Schedule stop on the tour',
      sql: `SELECT count(*) AS value FROM scheduled_agent_jobs`,
    },
    {
      atLeast: 8,
      describe: 'skills with usage for the Skills stop on the tour',
      sql: `SELECT count(DISTINCT skill_name) AS value FROM skill_usage_events`,
    },
  ],
  format: 'short',
  id: '21-dashboard-tour',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['The dashboard,', 'in 60 seconds'],
  },
  release: { order: 7, playlist: 'interfaces-and-dx', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'Six places. That is the whole dashboard.'],
        ['0:06', 'Home shows what your agents did while you were not looking.'],
        ['0:14', 'Plans is the work itself, and where you start one.'],
        ['0:22', 'Schedule is the work that happens without you.'],
        ['0:30', 'Search finds anything you have ever written, by meaning.'],
        ['0:39', 'Skills is what your agents know about how you work.'],
        [
          '0:47',
          'And settings is where you choose which models are allowed to run.',
        ],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'developer tools',
      'ai agents',
      'open source',
      'dashboard',
    ],
    title: 'The dashboard tour in 60 seconds',
  },
};
