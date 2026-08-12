import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useSkillCommandProvider } from '../useSkillCommandProvider';

const skills = [
  {
    description: 'Build a knowledge graph',
    disabledForModel: false,
    slug: 'graphify',
    tags: [],
  },
  {
    description: 'Audit the codebase',
    disabledForModel: false,
    slug: 'improve',
    tags: [],
  },
  {
    description: 'Manual only',
    disabledForModel: true,
    slug: 'manual',
    tags: [],
  },
];

const okResponse = (): Response =>
  new Response(JSON.stringify({ query: '', skills, truncated: false }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });

describe('useSkillCommandProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('fetches the listing once and fuzzy-filters by slug + description', async () => {
    const { result } = renderHook(() => useSkillCommandProvider());
    const provider = result.current;

    const all = await provider.onQuerySkills('');
    expect(all.map((skill) => skill.slug)).toEqual([
      'graphify',
      'improve',
      'manual',
    ]);

    // Matches on the slug.
    const bySlug = await provider.onQuerySkills('impro');
    expect(bySlug.map((skill) => skill.slug)).toEqual(['improve']);

    // Matches on the description too.
    const byDescription = await provider.onQuerySkills('knowledge');
    expect(byDescription.map((skill) => skill.slug)).toEqual(['graphify']);

    // Preserves the model-disabled flag through the mapping.
    expect(all.find((skill) => skill.slug === 'manual')?.disabledForModel).toBe(
      true,
    );

    // Cached: repeated queries do not hit the network again.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/skills/autocomplete');
  });

  test('de-duplicates concurrent first fetches', async () => {
    const { result } = renderHook(() => useSkillCommandProvider());
    const provider = result.current;

    await Promise.all([
      provider.onQuerySkills('a'),
      provider.onQuerySkills('b'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('returns no matches when the listing request fails', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));
    const { result } = renderHook(() => useSkillCommandProvider());

    expect(await result.current.onQuerySkills('graph')).toEqual([]);
  });
});
