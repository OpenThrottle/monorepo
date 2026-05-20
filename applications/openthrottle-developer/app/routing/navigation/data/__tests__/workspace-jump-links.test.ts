import { describe, expect, test } from 'vitest';
import {
  WORKSPACE_CORE_ENTITY_LINKS,
  WORKSPACE_FULL_JUMP_LINKS,
} from '~/routing/navigation/data/workspace-jump-links';

describe('routing/navigation data workspace-jump-links', () => {
  describe('WORKSPACE_CORE_ENTITY_LINKS', () => {
    test('each entry has a non-empty label and an internal path', () => {
      for (const link of WORKSPACE_CORE_ENTITY_LINKS) {
        expect(link.label.length).toBeGreaterThan(0);
        expect(link.to).toMatch(/^\//);
        expect(link.to.length).toBeGreaterThan(1);
      }
    });

    test('paths are unique', () => {
      const paths = WORKSPACE_CORE_ENTITY_LINKS.map((l) => l.to);
      expect(new Set(paths).size).toBe(paths.length);
    });

    test('covers dashboard, search, plans, projects, and notes', () => {
      const paths = WORKSPACE_CORE_ENTITY_LINKS.map((l) => l.to);
      expect(paths).toEqual([
        '/dashboard',
        '/search',
        '/plans',
        '/projects',
        '/notes',
      ]);
    });
  });

  describe('WORKSPACE_FULL_JUMP_LINKS', () => {
    test('each entry has a non-empty label and an internal path', () => {
      for (const link of WORKSPACE_FULL_JUMP_LINKS) {
        expect(link.label.length).toBeGreaterThan(0);
        expect(link.to).toMatch(/^\//);
        expect(link.to.length).toBeGreaterThan(1);
      }
    });

    test('paths are unique', () => {
      const paths = WORKSPACE_FULL_JUMP_LINKS.map((l) => l.to);
      expect(new Set(paths).size).toBe(paths.length);
    });

    test('includes primary workspace surfaces used in quick navigation', () => {
      const paths = WORKSPACE_FULL_JUMP_LINKS.map((l) => l.to);
      expect(paths).toContain('/search');
      expect(paths).toContain('/plans');
      expect(paths).toContain('/generators');
      expect(paths).toContain('/settings');
      expect(WORKSPACE_FULL_JUMP_LINKS.length).toBeGreaterThanOrEqual(10);
    });

    test('Search is first for palette-style ordering', () => {
      expect(WORKSPACE_FULL_JUMP_LINKS[0]?.to).toBe('/search');
      expect(WORKSPACE_FULL_JUMP_LINKS[0]?.label).toBe('Search');
    });
  });
});
