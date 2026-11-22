import { describe, expect, test } from 'vitest';

import type { TagActionCondition } from '../explainTagActionRuleMatch.ts';
import {
  explainTagActionRuleMatch,
  TAG_ACTION_CONDITIONS,
} from '../explainTagActionRuleMatch.ts';
import type {
  TagActionEvaluationContext,
  TagActionRuleInput,
} from '../tag-actions.ts';
import { evaluateTagActionRules, TAG_ACTION_TYPES } from '../tag-actions.ts';

const context: TagActionEvaluationContext = {
  effectiveTags: ['backend', 'spike'],
  environment: null,
  planStatus: 'PENDING',
  projectId: null,
  repositoryId: 'repo-1',
};

const rule = (
  overrides: Partial<TagActionRuleInput> = {},
): TagActionRuleInput => {
  return {
    actionPayload: {},
    actionType: TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    enabled: true,
    environment: null,
    id: 'rule-1',
    projectId: null,
    repositoryId: null,
    status: null,
    tagAll: [],
    ...overrides,
  };
};

const failedConditions = (
  overrides: Partial<TagActionRuleInput>,
  ctx = context,
): TagActionCondition[] => {
  return explainTagActionRuleMatch(ctx, rule(overrides))
    .conditions.filter((result) => !result.passed)
    .map((result) => result.condition);
};

describe('explainTagActionRuleMatch', () => {
  describe('a rule with no qualifiers', () => {
    test('matches and passes every condition', () => {
      const explanation = explainTagActionRuleMatch(context, rule());

      expect(explanation.matched).toBe(true);
      expect(explanation.conditions.every((result) => result.passed)).toBe(
        true,
      );
      expect(explanation.missingTags).toEqual([]);
      expect(explanation.failedOnlyOnEnvironment).toBe(false);
    });
  });

  describe('repository', () => {
    test('passes on an equal repository', () => {
      expect(failedConditions({ repositoryId: 'repo-1' })).toEqual([]);
    });

    test('fails on a different repository', () => {
      expect(failedConditions({ repositoryId: 'repo-2' })).toEqual([
        TAG_ACTION_CONDITIONS.REPOSITORY,
      ]);
    });

    test('fails for a plan with no repository', () => {
      const result = explainTagActionRuleMatch(
        { ...context, repositoryId: null },
        rule({ repositoryId: 'repo-1' }),
      );

      expect(result.matched).toBe(false);
      expect(result.conditions[0]).toEqual({
        actual: null,
        condition: TAG_ACTION_CONDITIONS.REPOSITORY,
        expected: 'repo-1',
        passed: false,
      });
    });
  });

  describe('environment', () => {
    test('fails when the rule is qualified and the context has none', () => {
      const result = explainTagActionRuleMatch(
        context,
        rule({ environment: 'ci' }),
      );

      expect(result.matched).toBe(false);
      expect(result.failedOnlyOnEnvironment).toBe(true);
    });

    test('passes on the equal environment', () => {
      const result = explainTagActionRuleMatch(
        { ...context, environment: 'ci' },
        rule({ environment: 'ci' }),
      );

      expect(result.matched).toBe(true);
      expect(result.failedOnlyOnEnvironment).toBe(false);
    });

    test('is not "only environment" when another condition also fails', () => {
      const result = explainTagActionRuleMatch(
        context,
        rule({ environment: 'ci', status: 'COMPLETED' }),
      );

      expect(result.failedOnlyOnEnvironment).toBe(false);
    });
  });

  describe('status', () => {
    test('fails on a different status', () => {
      expect(failedConditions({ status: 'COMPLETED' })).toEqual([
        TAG_ACTION_CONDITIONS.STATUS,
      ]);
    });
  });

  describe('tags', () => {
    test('lists the missing tags', () => {
      const explanation = explainTagActionRuleMatch(
        context,
        rule({ tagAll: ['spike', 'frontend', 'urgent'] }),
      );

      expect(explanation.missingTags).toEqual(['frontend', 'urgent']);
      expect(explanation.conditions[3]).toEqual({
        actual: 'spike',
        condition: TAG_ACTION_CONDITIONS.TAGS,
        expected: 'spike, frontend, urgent',
        passed: false,
      });
    });
  });

  describe('enabled', () => {
    test('a disabled rule never matches and is never "only environment"', () => {
      const explanation = explainTagActionRuleMatch(
        context,
        rule({ enabled: false, environment: 'ci' }),
      );

      expect(explanation.enabled).toBe(false);
      expect(explanation.matched).toBe(false);
      expect(explanation.failedOnlyOnEnvironment).toBe(false);
    });
  });

  describe('agreement with evaluateTagActionRules', () => {
    const repositories = [null, 'repo-1', 'repo-2'];
    const environments = [null, 'ci'];
    const statuses = [null, 'PENDING', 'COMPLETED'];
    const tagSets = [[], ['spike'], ['spike', 'urgent']];
    const projects = [null, 'project-1'];

    test('agrees on every combination of qualifiers', () => {
      for (const repositoryId of repositories) {
        for (const environment of environments) {
          for (const status of statuses) {
            for (const tagAll of tagSets) {
              for (const projectId of projects) {
                for (const enabled of [true, false]) {
                  const input = rule({
                    enabled,
                    environment,
                    projectId,
                    repositoryId,
                    status,
                    tagAll,
                  });
                  const explanation = explainTagActionRuleMatch(context, input);

                  expect(explanation.matched).toBe(
                    evaluateTagActionRules(context, [input]).length > 0,
                  );
                  expect(
                    enabled &&
                      explanation.conditions.every((result) => result.passed),
                  ).toBe(explanation.matched);
                }
              }
            }
          }
        }
      }
    });
  });
});
