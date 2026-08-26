/**
 * @description Episode 06-prd-to-plan — Turn a PRD into a plan and tasks
 *
 * Migrated verbatim from `docs/marketing/scripts/06-prd-to-plan.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * Uses the upload-and-decompose route. The PRD used on screen must be a fictional
 * one shipped with the demo seed — never a real internal document.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    { action: 'A fictional two-page PRD open in the browser.', t: '0:00' },
    { action: 'Navigate to `/plans/upload-decompose`.', t: '0:07' },
    {
      action: 'Drag the PRD file onto the drop zone; the filename appears.',
      t: '0:12',
    },
    { action: 'Click **Decompose**; a progress state shows.', t: '0:21' },
    { action: 'Proposed plan and task list render, editable.', t: '0:29' },
    { action: 'Edit one task title; delete one task.', t: '0:38' },
    {
      action: 'Click **Save**; plan detail loads with the accepted tasks.',
      t: '0:46',
    },
    { action: 'Outro card.', t: '0:54' },
  ],
  format: 'short',
  id: '06-prd-to-plan',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Turn a PRD', 'into a plan'],
  },
  release: { order: 12, playlist: 'planning-substrate', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '0:00',
          'You already wrote the spec. You should not have to write the plan too.',
        ],
        ['0:07', 'Drop it in here.'],
        [
          '0:12',
          'Any document you already have. A spec, a ticket, a wall of notes.',
        ],
        ['0:21', 'It reads the whole thing and pulls out the actual work.'],
        [
          '0:29',
          'You get a draft plan with tasks, in order, before anything is saved.',
        ],
        ['0:38', 'Fix what it got wrong. It will get something wrong.'],
        ['0:46', 'Then save it, and the agents have somewhere to start.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'product management',
      'developer tools',
      'open source',
    ],
    title: 'Turn a PRD into a plan and tasks',
  },
};
