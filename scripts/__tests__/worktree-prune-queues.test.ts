import { describe, expect, it } from 'vitest';

import {
  findOrphanedQueuePrefixes,
  liveQueuePrefixes,
  parseWorktreeListPorcelain,
  queuePrefixOfKey,
} from '../worktree_prune_queues.ts';

describe('parseWorktreeListPorcelain', () => {
  it('returns every worktree path, the primary checkout included', () => {
    const output = [
      'worktree /repo/monorepo',
      'HEAD 30c26b7f',
      'branch refs/heads/main',
      '',
      'worktree /wt/OpenThrottle/monorepo/loop-plan',
      'HEAD acd693bb',
      'branch refs/heads/feat/x',
      '',
      'worktree /wt/OpenThrottle/monorepo/gone',
      'HEAD 8391e73f',
      'detached',
      'prunable gitdir file points to non-existent location',
      '',
    ].join('\n');

    expect(parseWorktreeListPorcelain(output)).toEqual([
      '/repo/monorepo',
      '/wt/OpenThrottle/monorepo/loop-plan',
      '/wt/OpenThrottle/monorepo/gone',
    ]);
  });

  it('returns nothing for empty output', () => {
    expect(parseWorktreeListPorcelain('')).toEqual([]);
  });
});

describe('queuePrefixOfKey', () => {
  it('takes the bull:wt-<slug> prefix off a worktree queue key', () => {
    expect(queuePrefixOfKey('bull:wt-loop-plan:Plans:meta')).toBe(
      'bull:wt-loop-plan',
    );
    expect(
      queuePrefixOfKey('bull:wt-loop-plan:Work Ledger Sweep:repeat:abc'),
    ).toBe('bull:wt-loop-plan');
  });

  it.each([
    'bull:Plans:meta',
    'bull:wt-:Plans:meta',
    'bull:wt-x',
    'bull:wt-*:Plans:meta',
    'queue:wt-x:Plans:meta',
  ])('rejects %s, which is not under a worktree prefix', (key) => {
    expect(queuePrefixOfKey(key)).toBeNull();
  });
});

describe('liveQueuePrefixes', () => {
  it('protects both the env-resolved prefix and the directory-derived one for each worktree', () => {
    const envByPath: Record<string, Record<string, string>> = {
      '/repo/monorepo': {},
      '/wt/Loop-Plan': { OT_CONTAINER_PREFIX: 'wt-loop-plan-' },
      '/wt/custom': { OT_QUEUE_PREFIX: 'bull:wt-hand-edited' },
    };

    const live = liveQueuePrefixes(
      ['/repo/monorepo', '/wt/Loop-Plan', '/wt/custom', '/wt/no-env'],
      (path) => envByPath[path] ?? {},
    );

    expect(live).toEqual(
      new Set([
        'bull',
        'bull:wt-monorepo',
        'bull:wt-loop-plan',
        'bull:wt-hand-edited',
        'bull:wt-custom',
        'bull:wt-no-env',
      ]),
    );
  });
});

describe('findOrphanedQueuePrefixes', () => {
  const keys = [
    'bull:wt-live:Plans:meta',
    'bull:wt-live:Plans:stalled-check',
    'bull:wt-mobile-ux-fixes:Plans:meta',
    'bull:wt-mobile-ux-fixes:Daily Stats:meta',
    'bull:wt-mobile-ux-fixes:Daily Stats:stalled-check',
    'bull:wt-live-sibling:Plans:meta',
    'bull:Plans:meta',
    'bull:wt-:Plans:meta',
  ];

  it('lists prefixes no live worktree claims, with key counts, sorted', () => {
    expect(
      findOrphanedQueuePrefixes({
        keys,
        livePrefixes: new Set(['bull', 'bull:wt-live']),
      }),
    ).toEqual([
      { keyCount: 1, prefix: 'bull:wt-live-sibling' },
      { keyCount: 3, prefix: 'bull:wt-mobile-ux-fixes' },
    ]);
  });

  it('never reports a live prefix or the bare bull prefix', () => {
    const orphans = findOrphanedQueuePrefixes({
      keys,
      livePrefixes: new Set(['bull:wt-live']),
    }).map(({ prefix }) => prefix);

    expect(orphans).not.toContain('bull:wt-live');
    expect(orphans).not.toContain('bull');
    expect(orphans).not.toContain('bull:wt-');
  });

  it('reports nothing when every prefix is live', () => {
    expect(
      findOrphanedQueuePrefixes({
        keys: ['bull:wt-live:Plans:meta'],
        livePrefixes: new Set(['bull:wt-live']),
      }),
    ).toEqual([]);
  });
});
