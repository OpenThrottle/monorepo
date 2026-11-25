import { describe, expect, test } from 'vitest';

import type { SortBy } from '~/routing/projects/config';
import type { ProjectWithStats } from '~/routing/projects/types';

import { sortProjects } from '../sorting';

/** Coerces a value to a target type without a type assertion (for invalid-input branch coverage). */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

function project(
  overrides: Partial<ProjectWithStats> & Pick<ProjectWithStats, 'id' | 'name'>,
): ProjectWithStats {
  return {
    __typename: 'ProjectObject',
    createdAt: '2024-01-01T00:00:00.000Z',
    description: null,
    isFavorite: false,
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
    const sorted = sortProjects(projects, asMock<SortBy>('unknown'), 'asc');
    expect(sorted.map((p) => p.id)).toEqual(['1', '2']);
  });

  describe('when some projects are starred', () => {
    const projects: ProjectWithStats[] = [
      project({ id: '1', isFavorite: false, name: 'Alpha' }),
      project({ id: '2', isFavorite: true, name: 'Zulu' }),
      project({ id: '3', isFavorite: true, name: 'Mike' }),
      project({ id: '4', isFavorite: false, name: 'Bravo' }),
    ];

    test('keeps starred first, then sorts by name ascending', () => {
      const sorted = sortProjects(projects, 'name', 'asc');
      expect(sorted.map((p) => p.id)).toEqual(['3', '2', '1', '4']);
    });

    test('keeps starred first when the sort is descending', () => {
      const sorted = sortProjects(projects, 'name', 'desc');
      expect(sorted.map((p) => p.id)).toEqual(['2', '3', '4', '1']);
    });
  });
});
