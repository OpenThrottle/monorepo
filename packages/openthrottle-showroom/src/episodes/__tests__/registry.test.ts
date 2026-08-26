/**
 * @description The registry's job is to fail usefully.
 *
 * Four different code paths used to say some version of "missing front matter"
 * when handed a script they could not read, and none of them said what they
 * *could* read. A typo in `--script` should not cost you a round trip through
 * the docs directory.
 */

import { describe, expect, test } from 'vitest';

import {
  EPISODES,
  episodesInReleaseOrder,
  getEpisode,
  getVariant,
  resolveVariant,
} from '../registry';
import type { VideoEpisode } from '../types';

const episode = (
  id: string,
  order: number,
  variantIds: readonly string[],
): VideoEpisode => ({
  beats: [{ action: 'Terminal.', t: '0:00' }],
  format: 'short',
  id,
  production: { blockedOn: [], recording: 'live', titleCard: ['One', 'Two'] },
  release: { order, playlist: 'getting-started', status: 'draft' },
  selectedVariant: variantIds[0] ?? 'only',
  variants: variantIds.map((variantId) => ({
    id: variantId,
    narration: [['0:00', 'Words.'] as const],
    thesis: 'fixture',
  })),
  youtube: { summary: 'A fixture.', tags: [], title: 'A fixture' },
});

describe('getEpisode', () => {
  test('names what is registered when the id is unknown', () => {
    expect(() => getEpisode('does-not-exist')).toThrow(
      /unknown episode 'does-not-exist'/,
    );
    expect(() => getEpisode('does-not-exist')).toThrow(/Known episodes:/);
  });

  test('lists the episodes that do exist, so a typo is self-correcting', () => {
    const registered = Object.keys(EPISODES);

    expect(registered.length).toBeGreaterThan(0);

    for (const id of registered) {
      expect(() => getEpisode('05-connect')).toThrow(new RegExp(id));
    }
  });

  test('returns the episode it was asked for', () => {
    const [first] = Object.keys(EPISODES);

    expect(first).toBeDefined();
    expect(getEpisode(first ?? '').id).toBe(first);
  });
});

describe('resolveVariant', () => {
  const fixture = episode('05-connect-ot-mcp', 6, [
    'payoff-first',
    'problem-first',
  ]);

  test('defaults to the variant that ships', () => {
    expect(resolveVariant(fixture).id).toBe('payoff-first');
  });

  test('an explicit variant wins over the selected one', () => {
    expect(resolveVariant(fixture, 'problem-first').id).toBe('problem-first');
  });

  test('an unknown variant lists the ones that exist, sorted', () => {
    expect(() => resolveVariant(fixture, 'v3')).toThrow(
      /has no variant 'v3'\. Available: payoff-first, problem-first/,
    );
  });

  test('a selectedVariant naming nothing is caught, not silently skipped', () => {
    const broken: VideoEpisode = { ...fixture, selectedVariant: 'ghost' };

    expect(() => resolveVariant(broken)).toThrow(/has no variant 'ghost'/);
  });
});

describe('getVariant', () => {
  test('refuses an episode that is not registered', () => {
    expect(() => getVariant('99-does-not-exist')).toThrow(/unknown episode/);
  });

  test('resolves the shipping variant of a registered episode', () => {
    const [first] = Object.keys(EPISODES);
    const id = first ?? '';

    expect(getVariant(id).id).toBe(getEpisode(id).selectedVariant);
  });
});

describe('episodesInReleaseOrder', () => {
  test('returns every registered episode', () => {
    expect(episodesInReleaseOrder()).toHaveLength(Object.keys(EPISODES).length);
  });

  test('is sorted by release order, ascending', () => {
    const orders = episodesInReleaseOrder().map((entry) => entry.release.order);

    expect(orders).toEqual([...orders].sort((left, right) => left - right));
  });
});
