import { describe, expect, test } from 'vitest';
import type { SortBy } from '~/routing/projects/config';
import type { ProjectWithStats } from '~/routing/projects/data/types';
import { sortProjects } from '../sorting';

function project(
  overrides: Partial<ProjectWithStats> & Pick<ProjectWithStats, 'id' | 'name'>,
): ProjectWithStats {
  return {
    __typename: 'ProjectObject',
    createdAt: '2024-01-01T00:00:00.000Z',
    description: null,
    lastActivityAt: null,
    nxProjectName: null,
    planCount: null,
    plans: null,
    tasks: null,
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('sortProjects', () => {
  describe('when sortBy is name', () => {
    test('sorts ascending with base sensitivity', () => {
      const projects: ProjectWithStats[] = [
        project({ id: '1', name: 'zebra' }),
        project({ id: '2', name: 'Alpha' }),
        project({ id: '3', name: 'beta' }),
      ];
      const sorted = sortProjects(projects, 'name', 'asc');
      expect(sorted.map((p) => p.name)).toEqual(['Alpha', 'beta', 'zebra']);
    });

    test('sorts descending', () => {
      const projects: ProjectWithStats[] = [
        project({ id: '1', name: 'a' }),
        project({ id: '2', name: 'c' }),
        project({ id: '3', name: 'b' }),
      ];
      const sorted = sortProjects(projects, 'name', 'desc');
      expect(sorted.map((p) => p.name)).toEqual(['c', 'b', 'a']);
    });
  });

  describe('when sortBy is createdAt', () => {
    test('sorts ascending by ISO string', () => {
      const projects: ProjectWithStats[] = [
        project({
          createdAt: '2025-02-01T00:00:00.000Z',
          id: '1',
          name: 'late',
        }),
        project({
          createdAt: '2024-01-01T00:00:00.000Z',
          id: '2',
          name: 'early',
        }),
      ];
      const sorted = sortProjects(projects, 'createdAt', 'asc');
      expect(sorted.map((p) => p.name)).toEqual(['early', 'late']);
    });
  });

  describe('when sortBy is updatedAt', () => {
    test('sorts descending', () => {
      const projects: ProjectWithStats[] = [
        project({
          id: '1',
          name: 'old',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }),
        project({
          id: '2',
          name: 'new',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
      ];
      const sorted = sortProjects(projects, 'updatedAt', 'desc');
      expect(sorted.map((p) => p.name)).toEqual(['new', 'old']);
    });
  });

  test('does not mutate the input array', () => {
    const projects: ProjectWithStats[] = [
      project({ id: '1', name: 'b' }),
      project({ id: '2', name: 'a' }),
    ];
    const copy = [...projects];
    sortProjects(projects, 'name', 'asc');
    expect(projects).toEqual(copy);
  });

  test('when sortBy is unknown returns original order (stable)', () => {
    const projects: ProjectWithStats[] = [
      project({ id: '1', name: 'first' }),
      project({ id: '2', name: 'second' }),
    ];
    const sorted = sortProjects(projects, 'unknown' as SortBy, 'asc');
    expect(sorted.map((p) => p.id)).toEqual(['1', '2']);
  });
});
