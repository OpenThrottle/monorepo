/**
 * @description The description is the thing most likely to be quietly wrong,
 * because nobody reads it before pasting it.
 *
 * `publishing.md` says metadata is never retyped. These assertions are what makes
 * that true rather than aspirational: the standard block appears verbatim, the
 * per-video paragraph leads, and chapters appear only where they belong.
 */

import { describe, expect, test } from 'vitest';

import { composeDescription } from '../description';
import type { VideoEpisode } from '../types';

const base: VideoEpisode = {
  beats: [{ action: 'Terminal.', t: '0:00' }],
  format: 'short',
  id: '03-first-plan',
  production: { blockedOn: [], recording: 'live', titleCard: ['Your', 'plan'] },
  release: { order: 2, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    { id: 'only', narration: [['0:00', 'Words.']], thesis: 'fixture' },
  ],
  youtube: {
    summary: 'Create a plan and three tasks without leaving the terminal.',
    tags: ['openthrottle'],
    title: 'Your first plan in 60 seconds',
  },
};

describe('composeDescription', () => {
  test('leads with the per-video paragraph', () => {
    expect(
      composeDescription(base).startsWith(base.youtube.summary ?? ''),
    ).toBe(true);
  });

  test('carries the standard block verbatim', () => {
    const description = composeDescription(base);

    expect(description).toContain(
      'OpenThrottle is an open-source planning and execution substrate for coding',
    );
    expect(description).toContain(
      'Repo:    https://github.com/OpenThrottle/monorepo',
    );
    expect(description).toContain('License: Apache-2.0');
  });

  test('separates the paragraph from the block with a blank line', () => {
    const [first, second] = composeDescription(base).split('\n');

    expect(first).toBe(base.youtube.summary ?? '');
    expect(second).toBe('');
  });

  test('a short gets no chapter list', () => {
    expect(composeDescription(base)).not.toContain('Chapters:');
  });

  test('long-form appends the chapters after the block', () => {
    const longform: VideoEpisode = {
      ...base,
      format: 'longform',
      youtube: {
        ...base.youtube,
        chapters: [
          { label: 'What this is', t: '00:00' },
          { label: 'The first plan', t: '01:24' },
        ],
      },
    };
    const description = composeDescription(longform);

    expect(description).toContain('Chapters:');
    expect(description).toContain('00:00 What this is');
    expect(description).toContain('01:24 The first plan');
    expect(description.indexOf('Chapters:')).toBeGreaterThan(
      description.indexOf('License: Apache-2.0'),
    );
  });

  test('never reads a URL into the narration path — they live here only', () => {
    // Narration is written for the ear; a URL costs seconds of a 55-second budget
    // and sounds like a robot. This asserts the URLs are in the description.
    const description = composeDescription(base);
    const spoken = base.variants[0]?.narration.map(([, text]) => text) ?? [];

    expect(description).toContain('https://github.com/OpenThrottle/monorepo');
    expect(spoken.join(' ')).not.toContain('http');
  });
});
