// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IdeRepositoryRef } from '@openthrottle/react-router-ide';
import type { WorkspaceConfig } from '@openthrottle/openthrottle-ide';

vi.mock('@openthrottle/openthrottle-ide', () => ({
  findDefinition: vi.fn(),
  findReferences: vi.fn(),
  listExports: vi.fn(),
  listFiles: vi.fn(),
  searchText: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', () => ({
  toContainerPath: vi.fn((path: string) => `/container${path}`),
}));

const { findDefinition, findReferences, listExports, listFiles, searchText } =
  await import('@openthrottle/openthrottle-ide');
const { toContainerPath } =
  await import('@openthrottle/openthrottle-agentic-utils');
const { MAX_SEARCH_RESULTS, exportsVM, listFilesVM, searchVM, symbolTargetVM } =
  await import('../ide-engine.server');

const mockFindDefinition = vi.mocked(findDefinition);
const mockFindReferences = vi.mocked(findReferences);
const mockListExports = vi.mocked(listExports);
const mockListFiles = vi.mocked(listFiles);
const mockSearchText = vi.mocked(searchText);
const mockToContainerPath = vi.mocked(toContainerPath);

const repository: IdeRepositoryRef = {
  displayName: 'OpenThrottle',
  repositoryId: 'repo-1',
};

const config: WorkspaceConfig = {
  exclude: ['dist'],
  respectGitignore: true,
  root: '/host/repo',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockToContainerPath.mockImplementation((path: string) => `/container${path}`);
});

describe('listFilesVM', () => {
  test('translates the host root to the engine view and wraps the listing', async () => {
    mockListFiles.mockResolvedValue(['a.ts', 'b.ts']);

    const result = await listFilesVM(config, repository);

    expect(mockToContainerPath).toHaveBeenCalledWith('/host/repo');
    expect(mockListFiles).toHaveBeenCalledWith({
      exclude: ['dist'],
      respectGitignore: true,
      root: '/container/host/repo',
    });
    expect(result).toEqual({
      paths: ['a.ts', 'b.ts'],
      repository,
      truncated: false,
    });
  });
});

describe('searchVM', () => {
  test('short-circuits an empty query without calling the engine', async () => {
    const result = await searchVM(config, repository, '   ');

    expect(mockSearchText).not.toHaveBeenCalled();
    expect(result).toEqual({
      matches: [],
      query: '   ',
      repository,
      truncated: false,
    });
  });

  test('trims the query, caps results, and reports not truncated below the cap', async () => {
    mockSearchText.mockResolvedValue([
      {
        column: 1,
        line: 1,
        lineText: 'const hit = 1',
        matchText: 'hit',
        path: 'a.ts',
      },
    ]);

    const result = await searchVM(config, repository, '  needle  ');

    expect(mockSearchText).toHaveBeenCalledWith(
      'needle',
      {
        exclude: ['dist'],
        respectGitignore: true,
        root: '/container/host/repo',
      },
      { maxResults: MAX_SEARCH_RESULTS },
    );
    expect(result.query).toBe('  needle  ');
    expect(result.truncated).toBe(false);
    expect(result.matches).toHaveLength(1);
  });

  test('marks the result truncated when matches reach the cap', async () => {
    const matches = Array.from({ length: MAX_SEARCH_RESULTS }, (_, index) => ({
      column: 1,
      line: index + 1,
      lineText: 'const hit = 1',
      matchText: 'hit',
      path: 'a.ts',
    }));
    mockSearchText.mockResolvedValue(matches);

    const result = await searchVM(config, repository, 'needle');

    expect(result.truncated).toBe(true);
  });
});

describe('exportsVM', () => {
  test('returns the engine symbols against the translated root', async () => {
    const symbols = [
      {
        isDefault: false,
        kind: 'function',
        line: 1,
        name: 'foo',
        path: 'a.ts',
      },
    ];
    mockListExports.mockResolvedValue(symbols);

    const result = await exportsVM(config, repository);

    expect(mockListExports).toHaveBeenCalledWith({
      exclude: ['dist'],
      respectGitignore: true,
      root: '/container/host/repo',
    });
    expect(result).toEqual({
      repository,
      symbols,
      truncated: false,
    });
  });
});

describe('symbolTargetVM', () => {
  test('builds a name target when a non-empty name is supplied', async () => {
    mockFindDefinition.mockResolvedValue([]);
    mockFindReferences.mockResolvedValue([]);

    await symbolTargetVM(config, repository, { name: 'doThing' });

    expect(mockFindDefinition).toHaveBeenCalledWith(expect.anything(), {
      name: 'doThing',
    });
    expect(mockFindReferences).toHaveBeenCalledWith(expect.anything(), {
      name: 'doThing',
    });
  });

  test('builds a position target when the name is empty', async () => {
    mockFindDefinition.mockResolvedValue([]);
    mockFindReferences.mockResolvedValue([]);

    await symbolTargetVM(config, repository, {
      line: 12,
      name: '',
      path: 'a.ts',
    });

    expect(mockFindDefinition).toHaveBeenCalledWith(expect.anything(), {
      column: 1,
      line: 12,
      path: 'a.ts',
    });
  });

  test('defaults position fields when line and path are omitted', async () => {
    mockFindDefinition.mockResolvedValue([]);
    mockFindReferences.mockResolvedValue([]);

    await symbolTargetVM(config, repository, {});

    expect(mockFindDefinition).toHaveBeenCalledWith(expect.anything(), {
      column: 1,
      line: 1,
      path: '',
    });
  });

  test('returns definitions/references and falls back to the first definition for symbol metadata', async () => {
    mockFindDefinition.mockResolvedValue([
      { column: 3, kind: 'const', line: 7, name: 'resolved', path: 'b.ts' },
    ]);
    mockFindReferences.mockResolvedValue([
      { column: 5, line: 9, path: 'c.ts' },
    ]);

    const result = await symbolTargetVM(config, repository, {});

    expect(result.definitions).toHaveLength(1);
    expect(result.references).toHaveLength(1);
    expect(result.repository).toEqual(repository);
    expect(result.symbol).toEqual({ line: 7, name: 'resolved', path: 'b.ts' });
  });

  test('prefers explicit input fields over the resolved definition', async () => {
    mockFindDefinition.mockResolvedValue([
      { column: 3, line: 7, name: 'resolved', path: 'b.ts' },
    ]);
    mockFindReferences.mockResolvedValue([]);

    const result = await symbolTargetVM(config, repository, {
      line: 42,
      name: 'explicit',
      path: 'x.ts',
    });

    expect(result.symbol).toEqual({
      line: 42,
      name: 'explicit',
      path: 'x.ts',
    });
  });

  test('zeroes/blanks symbol metadata when nothing resolves', async () => {
    mockFindDefinition.mockResolvedValue([]);
    mockFindReferences.mockResolvedValue([]);

    const result = await symbolTargetVM(config, repository, {});

    expect(result.symbol).toEqual({ line: 0, name: '', path: '' });
  });
});
