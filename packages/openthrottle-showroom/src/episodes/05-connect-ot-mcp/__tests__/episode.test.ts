/**
 * @description Migration parity for episode 05.
 *
 * The five markdown files this episode replaces are deleted, so these numbers are
 * the only surviving evidence that the transcription was faithful. They were
 * captured from `scripts/validate-video-scripts.ts` before the files went away:
 *
 *     05-connect-ot-mcp.md      99 words   ~41s
 *     05-connect-ot-mcp-v0.md   91 words   ~38s
 *     05-connect-ot-mcp-v1.md  112 words   ~46s
 *     05-connect-ot-mcp-v2.md  110 words   ~46s
 *     05-connect-ot-mcp-v3.md  101 words   ~42s
 *
 * `-v3` is intentionally absent below: it was a stale copy of the canonical file
 * carrying a "Plan and tasks" typo and a trailing "Starting here." that the
 * shipping cut had removed. `payoff-first` is the canonical 99-word text.
 */

import { describe, expect, test } from 'vitest';

import { budgetWords, spokenWords } from '../../derived';
import { episode } from '../episode';
import { resolveVariant } from '../../registry';

describe('episode 05 migration parity', () => {
  test.each([
    ['payoff-first', 99],
    ['plainest', 91],
    ['problem-first', 112],
    ['how-it-works', 110],
  ])('%s reproduces its markdown word count (%i)', (id, expected) => {
    expect(spokenWords(resolveVariant(episode, id))).toBe(expected);
  });

  test('every variant is under the short budget', () => {
    for (const variant of episode.variants) {
      expect(spokenWords(variant)).toBeLessThan(budgetWords('short'));
    }
  });
});

describe('episode 05 shape', () => {
  test('ships the payoff-first take', () => {
    expect(episode.selectedVariant).toBe('payoff-first');
    expect(resolveVariant(episode).id).toBe('payoff-first');
  });

  test('keeps all four takes rather than only the one that ships', () => {
    expect(episode.variants.map((variant) => variant.id).sort()).toEqual([
      'how-it-works',
      'payoff-first',
      'plainest',
      'problem-first',
    ]);
  });

  test('every variant records why it exists', () => {
    for (const variant of episode.variants) {
      expect((variant.thesis ?? '').length).toBeGreaterThan(40);
    }
  });

  test('the canonical fix survived the migration', () => {
    // The shipping cut corrected "Plan and tasks" to "Plans and tasks"; the -v3
    // file on disk never got that fix. Transcribing the wrong file would have
    // silently reintroduced the typo into the narration the TTS reads.
    const shipping = resolveVariant(episode);
    const line = shipping.narration.find(([t]) => t === '0:39')?.[1] ?? '';

    expect(line).toContain('Plans and tasks');
    expect(line).not.toContain('Plan and tasks,');
  });

  test('the hook is the trimmed one, not the -v3 draft', () => {
    const shipping = resolveVariant(episode);
    const hook = shipping.narration.find(([t]) => t === '0:00')?.[1] ?? '';

    expect(hook).not.toContain('Starting here.');
  });

  test('every narration cue names a time that exists in the beats', () => {
    // Cues own their timings and need not align with beats, but episode 05 was
    // written against the beat table, so a cue outside it means a transcription
    // slip rather than a deliberate choice.
    const beatTimes = new Set(episode.beats.map((beat) => beat.t));

    for (const variant of episode.variants) {
      for (const [t] of variant.narration) {
        expect(beatTimes.has(t), `${variant.id} cue at ${t}`).toBe(true);
      }
    }
  });

  test('the outro beat carries no narration in any variant', () => {
    for (const variant of episode.variants) {
      expect(variant.narration.some(([t]) => t === '0:53')).toBe(false);
    }
  });

  test('tags carry the baseline plus the episode-specific ones', () => {
    for (const baseline of [
      'ai agents',
      'coding agents',
      'developer tools',
      'open source',
      'openthrottle',
    ]) {
      expect(episode.youtube.tags).toContain(baseline);
    }

    expect(episode.youtube.tags.length).toBeGreaterThanOrEqual(6);
    expect(episode.youtube.tags.length).toBeLessThanOrEqual(10);
  });
});
