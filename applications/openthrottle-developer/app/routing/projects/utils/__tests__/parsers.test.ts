import { describe, expect, test } from 'vitest';
import type { GetProjectsQuery } from '~/__generated__/graphql';
import type { ProjectWithStats } from '~/routing/projects/data/types';
import {
  parseProjectWithStats,
  parseProjectsBySearch,
  parseProjectsSortFromSearchParams,
} from '../parsers';

function apiProject(
  overrides: Partial<GetProjectsQuery['projects'][number]> &
    Pick<GetProjectsQuery['projects'][number], 'id' | 'name'>,
): GetProjectsQuery['projects'][number] {
  return {
    __typename: 'ProjectObject',
    createdAt: '2024-01-01T00:00:00.000Z',
    description: null,
    nxProjectName: null,
    plans: null,
    tasks: null,
    updatedAt: '2024-02-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('parseProjectWithStats', () => {
  test('spreads API fields and nulls optional stats', () => {
    const input = apiProject({
      description: 'Desc',
      id: 'p-1',
      name: 'My project',
    });
    const result = parseProjectWithStats(input);
    expect(result).toMatchObject({
      description: 'Desc',
      id: 'p-1',
      lastActivityAt: null,
      name: 'My project',
      planCount: null,
    });
  });
});

describe('parseProjectsBySearch', () => {
  const sample: ProjectWithStats[] = [
    {
      __typename: 'ProjectObject',
      createdAt: null,
      description: 'Contains FOOBAR in description',
      id: '1',
      lastActivityAt: null,
      name: 'Alpha',
      nxProjectName: null,
      planCount: null,
      plans: null,
      tasks: null,
      updatedAt: null,
    },
    {
      __typename: 'ProjectObject',
      createdAt: null,
      description: null,
      id: '2',
      lastActivityAt: null,
      name: 'Other',
      nxProjectName: 'packages/foo-bar',
      planCount: null,
      plans: null,
      tasks: null,
      updatedAt: null,
    },
  ];

  test('returns all projects when search is blank or whitespace', () => {
    expect(parseProjectsBySearch(sample, '')).toEqual(sample);
    expect(parseProjectsBySearch(sample, '   ')).toEqual(sample);
  });

  test('filters by name case-insensitively', () => {
    const filtered = parseProjectsBySearch(sample, 'ALP');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('1');
  });

  test('filters by description substring', () => {
    const filtered = parseProjectsBySearch(sample, 'foobar');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('1');
  });

  test('filters by nxProjectName substring', () => {
    const filtered = parseProjectsBySearch(sample, 'foo-bar');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('2');
  });
});

describe('parseProjectsSortFromSearchParams', () => {
  test('defaults to createdAt and desc when params missing', () => {
    const params = new URLSearchParams();
    expect(parseProjectsSortFromSearchParams(params)).toEqual({
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  test('reads valid sortBy and sortOrder', () => {
    const params = new URLSearchParams({
      sortBy: 'name',
      sortOrder: 'asc',
    });
    expect(parseProjectsSortFromSearchParams(params)).toEqual({
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  test('falls back when sortBy is invalid', () => {
    const params = new URLSearchParams({
      sortBy: 'title',
      sortOrder: 'asc',
    });
    expect(parseProjectsSortFromSearchParams(params)).toEqual({
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
  });

  test('falls back when sortOrder is invalid', () => {
    const params = new URLSearchParams({
      sortBy: 'updatedAt',
      sortOrder: 'newest',
    });
    expect(parseProjectsSortFromSearchParams(params)).toEqual({
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  });
});
