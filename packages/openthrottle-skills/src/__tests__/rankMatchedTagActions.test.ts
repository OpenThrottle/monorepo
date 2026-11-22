import { describe, expect, test } from 'vitest';

import {
  rankMatchedTagActions,
  scoreTagActionSpecificity,
} from '../rankMatchedTagActions.ts';
import type { MatchedTagAction, TagActionRuleScope } from '../tag-actions.ts';
import { TAG_ACTION_TYPES } from '../tag-actions.ts';

const globalScope: TagActionRuleScope = {
  environment: null,
  projectId: null,
  repositoryId: null,
  status: null,
  tagAll: [],
};

const match = (
  ruleId: string,
  scope: Partial<TagActionRuleScope>,
  createdAt = '2026-01-01T00:00:00.000Z',
): MatchedTagAction => {
  const fullScope = { ...globalScope, ...scope };
  return {
    actionPayload: {},
    actionType: TAG_ACTION_TYPES.AVAILABILITY_EXCEPTION,
    createdAt: new Date(createdAt),
    matchedTags: [...fullScope.tagAll],
    ruleId,
    scope: fullScope,
  };
};

const rankedIds = (matches: readonly MatchedTagAction[]): string[] => {
  return rankMatchedTagActions(matches).map((action) => action.ruleId);
};

describe('scoreTagActionSpecificity', () => {
  test('a global, untagged rule scores zero', () => {
    expect(scoreTagActionSpecificity(globalScope)).toBe(0);
  });

  test('repository counts two, environment and status one each, plus one per tag', () => {
    expect(
      scoreTagActionSpecificity({
        environment: 'ci',
        projectId: null,
        repositoryId: 'repo-1',
        status: 'PENDING',
        tagAll: ['backend', 'database'],
      }),
    ).toBe(6);
  });

  test('a project scope counts two', () => {
    expect(
      scoreTagActionSpecificity({ ...globalScope, projectId: 'project-1' }),
    ).toBe(2);
  });

  test('project and repository do not nest: a rule scoped to both adds both', () => {
    expect(
      scoreTagActionSpecificity({
        ...globalScope,
        projectId: 'project-1',
        repositoryId: 'repo-1',
      }),
    ).toBe(4);
  });
});

describe('rankMatchedTagActions', () => {
  test('a repository-scoped rule beats a global one', () => {
    expect(
      rankedIds([match('global', {}), match('repo', { repositoryId: 'r' })]),
    ).toEqual(['repo', 'global']);
  });

  test('an environment-qualified rule beats an unqualified one', () => {
    expect(
      rankedIds([match('plain', {}), match('env', { environment: 'ralph' })]),
    ).toEqual(['env', 'plain']);
  });

  test('more tags beat fewer', () => {
    expect(
      rankedIds([
        match('one-tag', { tagAll: ['backend'] }),
        match('two-tags', { tagAll: ['backend', 'database'] }),
      ]),
    ).toEqual(['two-tags', 'one-tag']);
  });

  test('a repository scope outranks a single extra tag', () => {
    expect(
      rankedIds([
        match('tagged', { tagAll: ['backend'] }),
        match('repo', { repositoryId: 'r' }),
      ]),
    ).toEqual(['repo', 'tagged']);
  });

  test('a project-scoped rule beats a global one', () => {
    expect(
      rankedIds([match('global', {}), match('project', { projectId: 'p' })]),
    ).toEqual(['project', 'global']);
  });

  test('a project scope and a repository scope tie, broken by createdAt', () => {
    expect(
      rankedIds([
        match('repo', { repositoryId: 'r' }, '2026-03-01T00:00:00.000Z'),
        match('project', { projectId: 'p' }, '2026-02-01T00:00:00.000Z'),
      ]),
    ).toEqual(['project', 'repo']);
  });

  test('a rule scoped to both project and repository beats either alone', () => {
    expect(
      rankedIds([
        match('repo', { repositoryId: 'r' }),
        match('both', { projectId: 'p', repositoryId: 'r' }),
        match('project', { projectId: 'p' }),
      ]),
    ).toEqual(['both', 'project', 'repo']);
  });

  describe('ties', () => {
    test('break on createdAt ascending', () => {
      expect(
        rankedIds([
          match('newer', {}, '2026-03-01T00:00:00.000Z'),
          match('older', {}, '2026-02-01T00:00:00.000Z'),
        ]),
      ).toEqual(['older', 'newer']);
    });

    test('break on rule id when createdAt is equal too', () => {
      expect(rankedIds([match('b', {}), match('a', {})])).toEqual(['a', 'b']);
    });
  });

  test('is pure: keeps every match and does not reorder the input', () => {
    const input = [match('global', {}), match('repo', { repositoryId: 'r' })];

    const ranked = rankMatchedTagActions(input);

    expect(ranked).toHaveLength(2);
    expect(input.map((action) => action.ruleId)).toEqual(['global', 'repo']);
  });
});
