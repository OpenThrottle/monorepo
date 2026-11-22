/**
 * @description Episode L2-setup-from-scratch — OpenThrottle setup from scratch: clone to running in one sitting
 *
 * Migrated verbatim from `docs/marketing/scripts/L2-setup-from-scratch.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * The onboarding piece. Its job is that a viewer can follow along in a second window
 * and end up with a running instance. That makes it the one video where **real time
 * matters more than pace** — do not cut a wait short and imply setup is faster than
 * it is.
 *
 * 2026-11-22: re-scripted against the repo so every beat is something that can be
 * filmed truthfully. The sign-in beat types the demo credentials (the form is
 * prefilled only in development); the "create one plan" beat is gone, because the
 * web form was removed and plans are written by the agent, which the later beats
 * already show; the dashboard is the seeded demo, so it is not called empty; Node
 * is twenty-six (`engines.node`, not twenty-two); and the two troubleshooting
 * beats show the repo's own error text. The terminals are typeset surfaces, not a
 * live machine, so "clean machine" below describes what they show. See `./flow.ts`
 * and `./surface.ts`.
 *
 * Recorded on a genuinely clean machine state: fresh clone, no node_modules, no
 * containers running, no `.env`. If the take starts from a warm machine it is a lie
 * by omission, and the first comment will say so.
 */

import type { VideoEpisode } from '../types.ts';

export const episode: VideoEpisode = {
  beats: [
    {
      action: 'The finished dashboard, then hard cut to an empty terminal.',
      t: '00:00',
    },
    {
      action: 'Show `node --version`, `pnpm --version`, `docker ps`.',
      t: '00:20',
    },
    { action: 'Clone the repository; `cd` into it.', t: '00:50' },
    { action: 'Run `pnpm install`; the long wait.', t: '01:20' },
    { action: 'Run `./scripts/setup.sh`.', t: '02:10' },
    {
      action: 'Docker containers start: Postgres and Redis.',
      t: '02:40',
    },
    { action: 'Migrations apply; the ledger output scrolls.', t: '03:20' },
    { action: 'The seeded-user line appears.', t: '03:50' },
    { action: 'Run `pnpm run start`.', t: '04:00' },
    {
      action: 'API boot output; then the dashboard build and serve.',
      t: '04:30',
    },
    {
      action: `Browser to the dashboard; type the demo credentials into the sign-in form; submit.`,
      t: '05:20',
    },
    {
      action: 'Dashboard loads: the demo workspace, not an empty install.',
      t: '05:50',
    },
    {
      action: 'Terminal: `pnpm run setup:mcp-instructions`; copy the block.',
      t: '06:30',
    },
    {
      action: `Run the printed command to register the server in the agent's config; restart the agent.`,
      t: '07:00',
    },
    {
      action: `Ask the agent to create a plan; it reports the plan it wrote, and the plan is at the top of Plans.`,
      t: '07:30',
    },
    { action: 'Show a failed Postgres connection and the fix.', t: '08:00' },
    { action: 'Show a stale env var and the fix.', t: '08:40' },
    { action: 'Back to the working dashboard.', t: '09:20' },
    { action: 'Outro card.', t: '09:50' },
  ],
  format: 'longform',
  id: 'L2-setup-from-scratch',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Setup from scratch', 'Season 1 · Episode 2'],
  },
  release: { order: 4, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '00:00',
          'By the end of this you will have this running on your own machine. It takes about ten minutes, most of it waiting.',
        ],
        [
          '00:20',
          'Three things first. Node twenty-six or newer, pnpm, and Docker running.',
        ],
        ['00:50', 'Clone it. It is one repository with everything in it.'],
        ['01:20', 'Install. This is the long wait, and it is the only one.'],
        ['02:10', 'Then one script does the rest of the setup.'],
        [
          '02:40',
          'It starts Postgres and Redis in containers, on their own ports, so they do not fight anything you already run.',
        ],
        [
          '03:20',
          'It applies every migration. Run it twice and nothing happens twice, which matters more than it sounds.',
        ],
        ['03:50', 'And it creates a login for you.'],
        ['04:00', 'Now start it.'],
        ['04:30', 'The API comes up, the dashboard waits for it, then serves.'],
        ['05:20', 'Open it and log in with the seeded account.'],
        [
          '05:50',
          'A fresh install starts nearly empty. This is the demo workspace, so there is something to see. Either way it is yours: nothing was uploaded and nothing was shared.',
        ],
        [
          '06:30',
          'Last step, and the one that makes it useful. Wire your agent to it.',
        ],
        [
          '07:00',
          "Run that command, which adds it to your agent's config, and restart the agent.",
        ],
        [
          '07:30',
          'Ask it to make a plan. If it answers, you are done, and the plan is in the dashboard.',
        ],
        [
          '08:00',
          'Two things go wrong for most people. The database is not running, which looks like this.',
        ],
        [
          '08:40',
          'And a stale environment file, which looks like this. Each prints its own fix.',
        ],
        [
          '09:20',
          'That is a complete local install, with no account and nothing leaving your machine.',
        ],
      ],
    },
  ],
  youtube: {
    chapters: [
      { label: 'The finished dashboard', t: '00:00' },
      { label: 'What you need first', t: '00:20' },
      { label: 'Clone and install', t: '00:50' },
      { label: 'Run the setup script', t: '02:10' },
      { label: 'Migrations and the seeded login', t: '03:20' },
      { label: 'Start it', t: '04:00' },
      { label: 'Sign in', t: '05:20' },
      { label: 'Connect your agent', t: '06:30' },
      { label: 'When it goes wrong', t: '08:00' },
      { label: 'A working install', t: '09:20' },
    ],
    tags: [
      'openthrottle',
      'developer tools',
      'monorepo',
      'open source',
      'self hosting',
    ],
    title: 'OpenThrottle setup from scratch: clone to running in one sitting',
  },
};
