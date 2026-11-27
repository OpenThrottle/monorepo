import { describe, expect, it } from 'vitest';

import {
  checkAllowlist,
  collectCopyLeaves,
  entryOf,
  findUnusedCopyKeys,
} from '../audit-copy-keys.ts';

const COPY_FILE = 'packages/react-router-x/src/data/copy.ts';

const COPY_SOURCE = [
  'export const X_COPY = {',
  '  title: `Title`,',
  '  drawer: { close: `Close`, open: `Open` },',
  '  status: { done: `Done`, failed: `Failed` },',
  '} as const;',
].join('\n');

const copyFile = { content: COPY_SOURCE, file: COPY_FILE };

const unusedPaths = (sources: readonly string[]): readonly string[] => {
  return findUnusedCopyKeys(
    copyFile,
    sources.map((content, index) => ({ content, file: `src/f${index}.tsx` })),
  ).map((key) => key.keyPath);
};

describe('collectCopyLeaves', () => {
  it('flattens nested objects into dotted leaf paths', () => {
    expect(collectCopyLeaves(COPY_FILE, COPY_SOURCE)).toEqual([
      { constName: 'X_COPY', keyPath: 'title' },
      { constName: 'X_COPY', keyPath: 'drawer.close' },
      { constName: 'X_COPY', keyPath: 'drawer.open' },
      { constName: 'X_COPY', keyPath: 'status.done' },
      { constName: 'X_COPY', keyPath: 'status.failed' },
    ]);
  });

  it('ignores constants that are not exported objects', () => {
    const leaves = collectCopyLeaves(
      COPY_FILE,
      [
        'const LOCAL = { a: `a` };',
        'export const LIST = [`a`];',
        'export const ONE = { a: `a` };',
      ].join('\n'),
    );

    expect(leaves).toEqual([{ constName: 'ONE', keyPath: 'a' }]);
  });
});

describe('findUnusedCopyKeys', () => {
  it('reports keys nothing reads', () => {
    expect(
      unusedPaths([
        'const a = X_COPY.title; const b = X_COPY.drawer.close;',
        'const c = X_COPY["status"].done;',
      ]),
    ).toEqual(['drawer.open', 'status.failed']);
  });

  it('counts a read through a chained call as a read of the key', () => {
    expect(unusedPaths(['X_COPY.title.replace(`a`, b);'])).not.toContain(
      'title',
    );
  });

  it('counts an import alias', () => {
    const aliased = [
      'import { X_COPY as COPY } from "./copy";',
      'COPY.title;',
    ].join('\n');

    expect(unusedPaths([aliased])).not.toContain('title');
  });

  it('counts destructuring of a group', () => {
    expect(unusedPaths(['const { close } = X_COPY.drawer;'])).toEqual([
      'title',
      'drawer.open',
      'status.done',
      'status.failed',
    ]);
  });

  it('marks a whole group used on dynamic access', () => {
    expect(unusedPaths(['X_COPY.status[state];'])).toEqual([
      'title',
      'drawer.close',
      'drawer.open',
    ]);
  });

  it('marks everything used when the constant is used bare', () => {
    expect(unusedPaths(['render(X_COPY);'])).toEqual([]);
    expect(unusedPaths(['type T = keyof typeof X_COPY;'])).toEqual([]);
  });

  it('does not count a name that only appears in an import or a different constant', () => {
    expect(
      unusedPaths(['import { X_COPY } from "./copy";', 'OTHER_COPY.title;']),
    ).toHaveLength(5);
  });
});

describe('checkAllowlist', () => {
  const unused = findUnusedCopyKeys(copyFile, []).slice(0, 2);
  const [first, second] = unused;

  it('reports unlisted keys and stale entries', () => {
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;

    const result = checkAllowlist(
      [first, second],
      [entryOf(first), 'gone::X.y'],
    );

    expect(result.unlisted).toEqual([second]);
    expect(result.stale).toEqual(['gone::X.y']);
  });
});
