/**
 * @description Episode 18-ollama-local-models — Local models with Ollama — nothing leaves your box
 *
 * Migrated verbatim from `docs/marketing/scripts/18-ollama-local-models.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * **Replay** for the generated response. The network panel beat at 0:41 is the whole
 * video — if it does not read clearly at 1080 wide, cut something else to give it
 * more time.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        '`/settings/agents` with local Ollama models listed and one enabled.',
      t: '0:00',
    },
    {
      action: 'Enable a local model; it appears in the picker group.',
      t: '0:09',
    },
    { action: 'Home composer; pick the local model.', t: '0:18' },
    { action: 'Ask a question; the response streams.', t: '0:26' },
    {
      action:
        'Open the browser network panel; filter shows only localhost traffic.',
      t: '0:34',
    },
    {
      action: 'Hold on the network panel — every request is local.',
      t: '0:41',
    },
    { action: 'Back to the response.', t: '0:50' },
    { action: 'Outro card.', t: '0:56' },
  ],
  format: 'short',
  id: '18-ollama-local-models',
  production: {
    blockedOn: [],
    recording: 'replay',
    titleCard: ['Local models.', 'Nothing leaves.'],
  },
  release: { order: 20, playlist: 'interfaces-and-dx', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '0:00',
          'These models are running on this laptop. No API key anywhere.',
        ],
        [
          '0:09',
          'Turn one on and it shows up in the composer like anything else.',
        ],
        ['0:18', 'Pick it the same way you would pick a hosted one.'],
        ['0:26', 'Ask something. Same interface, same streaming.'],
        ['0:34', 'And here is the part that matters.'],
        [
          '0:41',
          'Nothing left the machine. Not the prompt, not the code, not the answer.',
        ],
        [
          '0:50',
          'Which is the only way some of us are allowed to use any of this.',
        ],
      ],
    },
  ],
  youtube: {
    tags: ['openthrottle', 'ollama', 'local ai', 'privacy', 'developer tools'],
    title: 'Local models with Ollama — nothing leaves your box',
  },
};
