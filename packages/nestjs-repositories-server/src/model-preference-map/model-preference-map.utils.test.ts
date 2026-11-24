import { describe, expect, it } from 'vitest';

import { toModelPreferenceMap } from './model-preference-map.utils.ts';

describe('toModelPreferenceMap', () => {
  it('groups model ids by driver', () => {
    const map = toModelPreferenceMap([
      { driver: 'claude', model: 'opus' },
      { driver: 'claude', model: 'haiku' },
      { driver: 'cursor', model: 'gpt-5' },
    ]);

    expect(map.get('claude')).toEqual(new Set(['opus', 'haiku']));
    expect(map.get('cursor')).toEqual(new Set(['gpt-5']));
  });

  it('skips agent-level rows whose model is null', () => {
    const map = toModelPreferenceMap([{ driver: 'claude', model: null }]);

    expect(map.size).toBe(0);
  });
});
