import { describe, expect, test } from 'vitest';

import type { RankedTagActionRule } from '../rule-groups';
import {
  compareRulesNarrowestFirst,
  countRulesByScope,
  groupRulesByRepository,
} from '../rule-groups';

const makeRule = (
  id: string,
  overrides: Partial<RankedTagActionRule> = {},
): RankedTagActionRule => {
  return {
    actionPayloadJson: '{}',
    actionType: 'inject-task',
    createdAt: '2026-01-01T00:00:00.000Z',
    enabled: true,
    id,
    repositoryId: null,
    specificity: 0,
    tagAll: [],
    title: id,
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'user-1',
    ...overrides,
  };
};

const repositories = [
  { id: 'r-web', name: 'website' },
  { id: 'r-mono', name: 'monorepo' },
  { id: 'r-empty', name: 'aaa-empty' },
];

describe('compareRulesNarrowestFirst', () => {
  test('orders by specificity descending', () => {
    const sorted = [
      makeRule('a', { specificity: 1 }),
      makeRule('b', { specificity: 3 }),
    ].sort(compareRulesNarrowestFirst);

    expect(sorted.map((rule) => rule.id)).toEqual(['b', 'a']);
  });

  test('breaks ties by createdAt ascending, then id', () => {
    const sorted = [
      makeRule('z', { createdAt: '2026-01-02T00:00:00.000Z' }),
      makeRule('b', { createdAt: '2026-01-01T00:00:00.000Z' }),
      makeRule('a', { createdAt: '2026-01-01T00:00:00.000Z' }),
    ].sort(compareRulesNarrowestFirst);

    expect(sorted.map((rule) => rule.id)).toEqual(['a', 'b', 'z']);
  });
});

describe('groupRulesByRepository', () => {
  test('returns no groups for no rules', () => {
    expect(groupRulesByRepository([], repositories)).toEqual([]);
  });

  test('orders Global, repositories by name, then unknown; omits empty groups', () => {
    const groups = groupRulesByRepository(
      [
        makeRule('web', { repositoryId: 'r-web' }),
        makeRule('gone', { repositoryId: 'r-deleted' }),
        makeRule('mono', { repositoryId: 'r-mono' }),
        makeRule('global'),
      ],
      repositories,
    );

    expect(groups.map((group) => group.kind)).toEqual([
      'global',
      'repository',
      'repository',
      'unknown',
    ]);
    expect(groups.map((group) => group.repositoryName)).toEqual([
      null,
      'monorepo',
      'website',
      null,
    ]);
  });

  test('sorts rules narrowest first inside each group', () => {
    const groups = groupRulesByRepository(
      [
        makeRule('wide', { repositoryId: 'r-mono', specificity: 2 }),
        makeRule('narrow', { repositoryId: 'r-mono', specificity: 4 }),
        makeRule('g-wide'),
        makeRule('g-narrow', { specificity: 1 }),
      ],
      repositories,
    );

    expect(groups[0]?.rules.map((rule) => rule.id)).toEqual([
      'g-narrow',
      'g-wide',
    ]);
    expect(groups[1]?.rules.map((rule) => rule.id)).toEqual(['narrow', 'wide']);
  });

  test('does not mutate its input', () => {
    const input = [makeRule('a'), makeRule('b', { specificity: 5 })];
    groupRulesByRepository(input, repositories);

    expect(input.map((rule) => rule.id)).toEqual(['a', 'b']);
  });
});

describe('countRulesByScope', () => {
  test('splits global from repository-scoped (dangling ids included)', () => {
    expect(
      countRulesByScope([
        makeRule('a'),
        makeRule('b', { repositoryId: 'r-mono' }),
        makeRule('c', { repositoryId: 'gone' }),
      ]),
    ).toEqual({ global: 1, repository: 2 });
  });
});
