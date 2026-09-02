/**
 * @description Episode 16-worktrees — Worktrees — parallel agents that do not step on each other
 *
 * Migrated verbatim from `docs/marketing/scripts/16-worktrees.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * **BLOCKED as an app video.** Worktrees work, but nothing in the UI shows them, so
 * this can only be a terminal video today. Either accept it as terminal-only (and
 * drop it down the order, as here), or ship worktree visibility first. Recording it
 * as an app video is not an option — there is no app surface to record.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'Terminal, two panes, two agents working in two directories at once.',
      t: '0:00',
    },
    { action: 'Run `pnpm run worktree:new feature-b`.', t: '0:09' },
    {
      action: 'Output shows the ports allocated for that worktree.',
      t: '0:18',
    },
    {
      action: 'Split to both panes; both agents editing different files.',
      t: '0:28',
    },
    { action: 'Show `git worktree list` with both entries.', t: '0:38' },
    { action: 'Hold on the two panes.', t: '0:47' },
    { action: 'Outro card.', t: '0:54' },
  ],
  dataRequirements: [
    {
      atLeast: 1,
      describe: 'a repository the workspace knows about',
      sql: `SELECT count(*) AS value FROM repositories`,
    },
    {
      atLeast: 1,
      describe: 'a checkout to render on the repository detail page',
      sql: `SELECT count(*) AS value FROM repository_checkouts`,
    },
  ],
  format: 'short',
  id: '16-worktrees',
  production: {
    blockedOn: [
      'Worktree state surfaced in the dashboard (today this is a CLI-only story)',
    ],
    recording: 'live',
    titleCard: ['Parallel agents,', 'no collisions'],
  },
  release: { order: 23, playlist: 'execution', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'Two agents. Two branches. Same repository. No collisions.'],
        ['0:09', 'One command makes a second checkout with its own branch.'],
        ['0:18', 'It gets its own ports too, so both stacks can run at once.'],
        [
          '0:28',
          "Now they cannot touch each other's files, because they are not in the same files.",
        ],
        [
          '0:38',
          'Git tracks them as one repository with two working directories.',
        ],
        ['0:47', 'Which is how you run four agents without four clones.'],
      ],
    },
  ],
  youtube: {
    tags: ['openthrottle', 'git', 'ai agents', 'monorepo', 'developer tools'],
    title: 'Worktrees — parallel agents that do not step on each other',
  },
};
