import { describe, expect, it } from 'vitest';
import {
  distributeEvenly,
  getChunkIndex,
  getExcludeSelector,
  getIsPackage,
  getShardSelectionErrors,
  getShardSelector,
  splitProjects,
} from '../parallelize-tasks.ts';

const APPS = [
  'openthrottle-admin',
  'openthrottle-developer',
  'openthrottle-server',
];
const PACKAGES = [
  '@openthrottle/nestjs-auth',
  '@openthrottle/react-router-chat',
  '@openthrottle/react-router-shadcn',
  '@tools/workflows',
];

describe('getIsPackage', () => {
  it('treats scope-prefixed names as packages', () => {
    expect(getIsPackage('@openthrottle/nestjs-auth')).toBe(true);
    expect(getIsPackage('@tools/workflows')).toBe(true);
  });

  it('treats unprefixed names as applications', () => {
    expect(getIsPackage('openthrottle-server')).toBe(false);
    expect(getIsPackage('monorepo')).toBe(false);
  });
});

describe('splitProjects', () => {
  it('separates applications from packages, preserving input order', () => {
    const { applications, packages } = splitProjects([...APPS, ...PACKAGES]);

    expect(applications).toEqual(APPS);
    expect(packages).toEqual(PACKAGES);
  });

  it('returns empty groups for an empty affected set', () => {
    expect(splitProjects([])).toEqual({ applications: [], packages: [] });
  });
});

describe('getChunkIndex', () => {
  it('rounds robin on the total number of already-dealt projects', () => {
    expect(getChunkIndex([[], [], []], 3)).toBe(0);
    expect(getChunkIndex([['a'], [], []], 3)).toBe(1);
    expect(getChunkIndex([['a'], ['b'], []], 3)).toBe(2);
    expect(getChunkIndex([['a'], ['b'], ['c']], 3)).toBe(0);
  });
});

describe('distributeEvenly', () => {
  it('deals applications before packages so heavy suites spread across shards', () => {
    const chunks = distributeEvenly([...APPS, ...PACKAGES], 3);

    // One application per shard first, then the packages continue the rotation.
    expect(chunks[0]).toEqual([
      'openthrottle-admin',
      '@openthrottle/nestjs-auth',
      '@tools/workflows',
    ]);
    expect(chunks[1]).toEqual([
      'openthrottle-developer',
      '@openthrottle/react-router-chat',
    ]);
    expect(chunks[2]).toEqual([
      'openthrottle-server',
      '@openthrottle/react-router-shadcn',
    ]);
  });

  it('sorts every project into exactly one chunk with no loss and no overlap', () => {
    const projects = [...APPS, ...PACKAGES];
    const chunks = distributeEvenly(projects, 3);
    const flat = chunks.flat();

    expect(flat).toHaveLength(projects.length);
    expect(new Set(flat)).toEqual(new Set(projects));
  });

  it('keeps chunk sizes within one of each other', () => {
    const projects = Array.from(
      { length: 22 },
      (_, index) => `@scope/pkg-${index}`,
    );
    const sizes = distributeEvenly(projects, 3).map((chunk) => chunk.length);

    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('returns chunkCount empty chunks for an empty affected set', () => {
    expect(distributeEvenly([], 3)).toEqual([[], [], []]);
  });

  it('leaves trailing chunks empty when there are fewer projects than shards', () => {
    expect(distributeEvenly(['openthrottle-server'], 3)).toEqual([
      ['openthrottle-server'],
      [],
      [],
    ]);
  });

  it('puts everything on one chunk when jobCount is 1', () => {
    const projects = [...APPS, ...PACKAGES];

    expect(distributeEvenly(projects, 1)).toEqual([projects]);
  });

  it('does not alias chunks — pushing into one chunk must not affect the others', () => {
    const chunks = distributeEvenly([], 3);
    chunks[0].push('openthrottle-server');

    expect(chunks[1]).toEqual([]);
    expect(chunks[2]).toEqual([]);
  });
});

describe('getExcludeSelector', () => {
  it('negates every project in the chunk by NAME, comma-joined', () => {
    expect(
      getExcludeSelector(['openthrottle-server', '@tools/workflows']),
    ).toBe('!openthrottle-server,!@tools/workflows');
  });

  // Regression guard: `!tag:name:<project>` resolves through the package.json
  // `name`, which is not always the Nx project name. The root project is
  // `monorepo` but tagged `name:@openthrottle/monorepo`, so the tag form matched
  // nothing and dropped it off every shard while CI stayed green.
  it('does not route through the name: tag', () => {
    expect(getExcludeSelector(['monorepo'])).toBe('!monorepo');
    expect(getExcludeSelector(['monorepo'])).not.toContain('tag:name:');
  });

  it('renders an empty string for an empty chunk', () => {
    expect(getExcludeSelector([])).toBe('');
  });
});

describe('getShardSelector', () => {
  it('returns the exclude selector for a non-empty chunk', () => {
    expect(getShardSelector(['openthrottle-server'], 1, 3)).toBe(
      '!openthrottle-server',
    );
  });

  it('returns an empty string when this shard drew an empty chunk', () => {
    expect(getShardSelector(['openthrottle-server'], 2, 3)).toBe('');
  });

  it('returns an empty string when the affected set is empty', () => {
    expect(getShardSelector([], 1, 3)).toBe('');
  });

  it('covers every affected project exactly once across all shards', () => {
    const projects = [...APPS, ...PACKAGES];
    const jobCount = 3;

    const covered = Array.from({ length: jobCount }, (_, index) =>
      getShardSelector(projects, index + 1, jobCount),
    )
      .filter(Boolean)
      .flatMap((selector) =>
        selector.split(',').map((entry) => entry.replace('!', '')),
      );

    expect(covered).toHaveLength(projects.length);
    expect(new Set(covered)).toEqual(new Set(projects));
  });

  it('assigns nothing twice when there are fewer projects than shards', () => {
    const selectors = [1, 2, 3].map((index) =>
      getShardSelector(
        ['openthrottle-server', 'openthrottle-developer'],
        index,
        3,
      ),
    );

    expect(selectors).toEqual([
      '!openthrottle-server',
      '!openthrottle-developer',
      '',
    ]);
  });
});

describe('getShardSelectionErrors', () => {
  it('reports nothing when the selector round-trips exactly', () => {
    expect(
      getShardSelectionErrors(
        ['openthrottle-server', '@tools/workflows'],
        ['@tools/workflows', 'openthrottle-server'],
      ),
    ).toEqual([]);
  });

  it('reports projects the selector failed to match (the silent-drop case)', () => {
    const errors = getShardSelectionErrors(
      ['monorepo', 'openthrottle-server'],
      ['openthrottle-server'],
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('does not match');
    expect(errors[0]).toContain('monorepo');
  });

  it('reports projects the selector over-matched (the double-run case)', () => {
    const errors = getShardSelectionErrors(
      ['openthrottle-server'],
      ['openthrottle-server', 'openthrottle-developer'],
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('not assigned to this shard');
    expect(errors[0]).toContain('openthrottle-developer');
  });

  it('reports both directions at once', () => {
    expect(
      getShardSelectionErrors(['monorepo'], ['openthrottle-developer']),
    ).toHaveLength(2);
  });

  it('reports nothing for an empty chunk that resolved to nothing', () => {
    expect(getShardSelectionErrors([], [])).toEqual([]);
  });
});
