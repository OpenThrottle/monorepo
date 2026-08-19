import { describe, expect, it } from 'vitest';
import {
  distributeEvenly,
  formatShardOutputs,
  getChunkIndex,
  getExcludeSelector,
  getIsPackage,
  getShardOutputs,
  getShardSelectionErrors,
  getShardSelector,
  getSuiteShardedProjects,
  getTestGrouping,
  splitProjects,
  SUITE_SHARDED_PROJECTS,
} from '../parallelize-tasks.ts';

const APPS = [
  'openthrottle-admin',
  'openthrottle-developer',
  'openthrottle-server',
];
const [SHARDED_APP] = SUITE_SHARDED_PROJECTS;
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

  // The suite-shard carve-out must not blunt this: the test grouping is checked
  // as its OWN grouping, so a project genuinely dropped from it still errors.
  it('still catches a drop from the carved-out test grouping', () => {
    const grouping = [SHARDED_APP, 'openthrottle-server'];
    const errors = getShardSelectionErrors(getTestGrouping(grouping), []);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('openthrottle-server');
    expect(errors[0]).not.toContain(SHARDED_APP);
  });
});

describe('SUITE_SHARDED_PROJECTS', () => {
  it('names the heavy developer suite the plan measured', () => {
    expect(SUITE_SHARDED_PROJECTS).toContain('openthrottle-developer');
  });

  // Same trap getExcludeSelector() guards: a `tag:name:` value here would build
  // a selector matching nothing, and the carve-out would silently drop the
  // suite off every box instead of sharding it across them.
  it('uses Nx project names, not tag:name: values', () => {
    SUITE_SHARDED_PROJECTS.forEach((project) => {
      expect(project).not.toContain('tag:');
    });
  });
});

describe('getSuiteShardedProjects', () => {
  it('returns the sharded projects present in the affected set', () => {
    expect(getSuiteShardedProjects([...APPS, ...PACKAGES])).toEqual([
      SHARDED_APP,
    ]);
  });

  it('returns nothing when the sharded app is not affected', () => {
    const affected = [...APPS, ...PACKAGES].filter(
      (project) => project !== SHARDED_APP,
    );

    expect(getSuiteShardedProjects(affected)).toEqual([]);
  });

  it('returns nothing for an empty affected set', () => {
    expect(getSuiteShardedProjects([])).toEqual([]);
  });
});

describe('getTestGrouping', () => {
  it('drops the sharded app from the chunk it was dealt to', () => {
    expect(getTestGrouping([SHARDED_APP, '@tools/workflows'])).toEqual([
      '@tools/workflows',
    ]);
  });

  it('leaves a chunk without the sharded app untouched', () => {
    const grouping = ['openthrottle-server', '@tools/workflows'];

    expect(getTestGrouping(grouping)).toEqual(grouping);
  });

  it('empties a chunk that held only the sharded app', () => {
    expect(getTestGrouping([SHARDED_APP])).toEqual([]);
  });
});

describe('getShardOutputs', () => {
  const projects = [...APPS, ...PACKAGES];
  const jobCount = 3;

  const outputsFor = (jobIndex: number) =>
    getShardOutputs(projects, jobIndex, jobCount);

  it('carves the sharded app out of testSelector but keeps it in selector', () => {
    // APPS deal one-per-shard, so the developer app lands on shard 2.
    const { selector, testSelector } = outputsFor(2);

    expect(selector).toContain(`!${SHARDED_APP}`);
    expect(testSelector).not.toContain(`!${SHARDED_APP}`);
    expect(testSelector).toBe('!@openthrottle/react-router-chat');
  });

  it('leaves selector and testSelector identical on boxes that did not draw it', () => {
    [1, 3].forEach((jobIndex) => {
      const { selector, testSelector } = outputsFor(jobIndex);

      expect(testSelector).toBe(selector);
    });
  });

  it('gives every box the same shard argument keyed to its own jobIndex', () => {
    expect(outputsFor(1).suiteShard).toBe('1/3');
    expect(outputsFor(2).suiteShard).toBe('2/3');
    expect(outputsFor(3).suiteShard).toBe('3/3');
  });

  it('names the sharded projects on every box, not just the one that drew it', () => {
    [1, 2, 3].forEach((jobIndex) => {
      expect(outputsFor(jobIndex).suiteShardProjects).toBe(SHARDED_APP);
    });
  });

  it('shards nothing when the sharded app is not affected', () => {
    const unaffected = projects.filter((project) => project !== SHARDED_APP);

    [1, 2, 3].forEach((jobIndex) => {
      const outputs = getShardOutputs(unaffected, jobIndex, jobCount);

      expect(outputs.suiteShard).toBe('');
      expect(outputs.suiteShardProjects).toBe('');
      expect(outputs.testSelector).toBe(outputs.selector);
    });
  });

  it('shards nothing for an empty affected set', () => {
    const outputs = getShardOutputs([], 1, jobCount);

    expect(outputs).toEqual({
      selector: '',
      suiteShard: '',
      suiteShardProjects: '',
      testSelector: '',
    });
  });

  it('still emits a shard argument on a box whose chunk is empty', () => {
    // Two affected projects, three boxes: box 3 draws nothing of its own, but
    // the sharded suite still owes it a third of the developer files.
    const outputs = getShardOutputs(
      ['openthrottle-server', SHARDED_APP],
      3,
      jobCount,
    );

    expect(outputs.selector).toBe('');
    expect(outputs.testSelector).toBe('');
    expect(outputs.suiteShard).toBe('3/3');
    expect(outputs.suiteShardProjects).toBe(SHARDED_APP);
  });

  it('covers every affected project exactly once for lint/typecheck', () => {
    const covered = [1, 2, 3]
      .map((jobIndex) => outputsFor(jobIndex).selector)
      .filter(Boolean)
      .flatMap((selector) =>
        selector.split(',').map((entry) => entry.replace('!', '')),
      );

    expect(covered).toHaveLength(projects.length);
    expect(new Set(covered)).toEqual(new Set(projects));
  });

  it('covers every affected project exactly once for test, counting the shard', () => {
    const viaPartition = [1, 2, 3]
      .map((jobIndex) => outputsFor(jobIndex).testSelector)
      .filter(Boolean)
      .flatMap((selector) =>
        selector.split(',').map((entry) => entry.replace('!', '')),
      );

    const viaShard = outputsFor(1)
      .suiteShardProjects.split(',')
      .filter(Boolean);
    const covered = [...viaPartition, ...viaShard];

    // The sharded app is absent from every testSelector and accounted for by
    // the --shard invocation instead. Nothing may fall between the two.
    expect(viaPartition).not.toContain(SHARDED_APP);
    expect(covered).toHaveLength(projects.length);
    expect(new Set(covered)).toEqual(new Set(projects));
  });
});

describe('formatShardOutputs', () => {
  const outputs = {
    selector: '!openthrottle-developer,!@tools/workflows',
    suiteShard: '2/3',
    suiteShardProjects: 'openthrottle-developer',
    testSelector: '!@tools/workflows',
  };

  it('emits one key=value per line', () => {
    expect(formatShardOutputs(outputs).split('\n')).toEqual([
      'selector=!openthrottle-developer,!@tools/workflows',
      'suiteShard=2/3',
      'suiteShardProjects=openthrottle-developer',
      'testSelector=!@tools/workflows',
    ]);
  });

  it('emits every key even when the value is empty', () => {
    const lines = formatShardOutputs({
      selector: '',
      suiteShard: '',
      suiteShardProjects: '',
      testSelector: '',
    }).split('\n');

    expect(lines).toEqual([
      'selector=',
      'suiteShard=',
      'suiteShardProjects=',
      'testSelector=',
    ]);
  });

  // The workflow reads these into shell variables. A space in any value would
  // word-split on the way in and hand Nx a truncated selector.
  it('never emits a value containing a space', () => {
    formatShardOutputs(outputs)
      .split('\n')
      .forEach((line) => expect(line).not.toContain(' '));
  });
});
