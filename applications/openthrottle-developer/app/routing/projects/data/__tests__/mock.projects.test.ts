import { describe, expect, test } from 'vitest';
import { MOCK_PROJECTS } from '../mock.projects';

describe('MOCK_PROJECTS', () => {
  test('exports a fixed-length seeded list', () => {
    expect(MOCK_PROJECTS).toHaveLength(12);
  });

  test('each item has required project fields', () => {
    for (const p of MOCK_PROJECTS) {
      expect(p.__typename).toBe('ProjectObject');
      expect(p.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(p.name.length).toBeGreaterThan(0);
      expect(p).toHaveProperty('createdAt');
      expect(p).toHaveProperty('updatedAt');
    }
  });
});
