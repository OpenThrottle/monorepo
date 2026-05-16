import { describe, expect, test } from 'vitest';
import { HOME_FEATURES, HOME_FEATURES_DOC_URL } from '~/routing/home/data';

describe('routing/home data', () => {
  test('HOME_FEATURES_DOC_URL points at features doc on GitHub', () => {
    expect(HOME_FEATURES_DOC_URL).toMatch(/features\.md$/);
    expect(HOME_FEATURES_DOC_URL).toContain('github.com');
  });

  test('HOME_FEATURES lists expected capability titles', () => {
    const titles = HOME_FEATURES.map((f) => f.title);
    expect(titles).toContain('Plans and tasks');
    expect(titles).toContain('Semantic search');
    expect(titles).toContain('Dashboard');
    expect(HOME_FEATURES.length).toBeGreaterThanOrEqual(6);
  });
});
