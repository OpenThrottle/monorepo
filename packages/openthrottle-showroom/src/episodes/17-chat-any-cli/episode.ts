/**
 * @description Episode 17-chat-any-cli — Chat with any CLI from the dashboard
 *
 * Migrated verbatim from `docs/marketing/scripts/17-chat-any-cli.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * **Replay** for the response at 0:38 — a live model call would make the take
 * non-deterministic and slow.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'Home composer, model picker open showing several CLIs grouped by provider.',
      t: '0:00',
    },
    { action: 'Pick one; the toolbar updates.', t: '0:09' },
    { action: 'Type a question in the composer.', t: '0:17' },
    { action: 'Send; the response streams in.', t: '0:25' },
    {
      action:
        'Switch the model picker to a different CLI; ask the same question.',
      t: '0:34',
    },
    {
      action: 'Show the conversation list in the sidebar with both threads.',
      t: '0:44',
    },
    { action: 'Outro card.', t: '0:52' },
  ],
  dataRequirements: [
    {
      atLeast: 20,
      describe: 'conversations in the chat sidebar',
      sql: `SELECT count(*) AS value FROM agent_conversations`,
    },
    {
      atLeast: 10,
      describe: 'conversations long enough to scroll as a real exchange',
      sql: `SELECT count(*) AS value FROM (SELECT c.id FROM agent_conversations c JOIN agent_conversation_messages m ON m.conversation_id = c.id GROUP BY c.id HAVING count(*) >= 4) x`,
    },
  ],
  format: 'short',
  id: '17-chat-any-cli',
  production: {
    blockedOn: [
      'There is no seam that replays a seeded conversation at streaming pace, so "send; the response streams in" is a live CLI call — non-deterministic in content and duration, and dependent on which CLIs happen to be installed on the recording host',
    ],
    recording: 'replay',
    titleCard: ['Any CLI,', 'one composer'],
  },
  release: { order: 10, playlist: 'interfaces-and-dx', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'Claude, Codex, OpenCode. Same box.'],
        [
          '0:09',
          'Pick which one answers. The rest of the interface does not change.',
        ],
        ['0:17', 'Ask it something about the repo you are actually in.'],
        [
          '0:25',
          'It runs the real CLI on your machine and streams the answer back.',
        ],
        ['0:34', 'Switch tools and ask again, if you want a second opinion.'],
        [
          '0:44',
          'Both conversations are kept, so you are not re-asking tomorrow.',
        ],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'claude code',
      'ai agents',
      'developer tools',
      'open source',
    ],
    title: 'Chat with any CLI from the dashboard',
  },
};
