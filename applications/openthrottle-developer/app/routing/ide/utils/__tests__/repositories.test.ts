import { describe, expect, test } from 'vitest';
import {
  resolveSelectedRepository,
  toRepositoryOptions,
} from '../repositories';
import type { IdeWorkspaceRepository } from '../repositories';

const repositories: IdeWorkspaceRepository[] = [
  {
    displayName: 'OpenThrottle',
    filesystemPath: '/abs/openthrottle',
    id: 'r1',
    projectId: 'p1',
  },
  {
    displayName: 'Sandbox',
    filesystemPath: '/abs/sandbox',
    id: 'r2',
    projectId: null,
  },
];

describe('toRepositoryOptions', () => {
  test('maps repositories to {id,label} options', () => {
    expect(toRepositoryOptions(repositories)).toEqual([
      { id: 'r1', label: 'OpenThrottle' },
      { id: 'r2', label: 'Sandbox' },
    ]);
  });
});

describe('resolveSelectedRepository', () => {
  test('returns null when no repository id is given', () => {
    expect(resolveSelectedRepository(repositories, null)).toBeNull();
    expect(resolveSelectedRepository(repositories, '')).toBeNull();
  });

  test('returns null when the id does not match', () => {
    expect(resolveSelectedRepository(repositories, 'nope')).toBeNull();
  });

  test('resolves the config root and repository ref', () => {
    expect(resolveSelectedRepository(repositories, 'r1')).toEqual({
      config: { root: '/abs/openthrottle' },
      repository: {
        displayName: 'OpenThrottle',
        projectId: 'p1',
        repositoryId: 'r1',
      },
    });
  });

  test('omits projectId when the repository has none', () => {
    const resolved = resolveSelectedRepository(repositories, 'r2');
    expect(resolved?.repository.projectId).toBeUndefined();
  });
});
