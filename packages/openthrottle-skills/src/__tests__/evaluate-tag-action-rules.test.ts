import { describe, expect, test } from 'vitest';

import {
  evaluateTagActionRules,
  type TagActionEvaluationContext,
  type TagActionRuleInput,
} from '../evaluate-tag-action-rules.ts';
import {
  availabilityExceptionActionPayloadSchema,
  injectTaskActionPayloadSchema,
  isTagActionType,
  parseTagActionPayload,
  TAG_ACTION_TYPES,
} from '../tag-action-payloads.ts';

const baseRule: TagActionRuleInput = {
  actionPayload: { skillSlug: 'grilling' },
  actionType: TAG_ACTION_TYPES.INJECT_TASK,
  enabled: true,
  environment: null,
  id: 'rule-1',
  projectId: null,
  status: null,
  tagAll: ['breakdown'],
};

const baseContext: TagActionEvaluationContext = {
  effectiveTags: ['breakdown', 'github'],
  environment: null,
  planStatus: 'PENDING',
  projectId: 'project-1',
};

describe('evaluateTagActionRules', () => {
  test.each<{
    context?: Partial<TagActionEvaluationContext>;
    matches: boolean;
    name: string;
    rule?: Partial<TagActionRuleInput>;
  }>([
    { matches: true, name: 'base rule matches base context' },
    {
      matches: false,
      name: 'disabled rule never matches',
      rule: { enabled: false },
    },
    {
      matches: true,
      name: 'NULL projectId matches any project',
      rule: { projectId: null },
    },
    {
      matches: true,
      name: 'equal projectId matches',
      rule: { projectId: 'project-1' },
    },
    {
      matches: false,
      name: 'different projectId does not match',
      rule: { projectId: 'project-2' },
    },
    {
      context: { projectId: null },
      matches: false,
      name: 'project-scoped rule does not match a projectless plan',
      rule: { projectId: 'project-1' },
    },
    {
      context: { environment: 'ralph' },
      matches: true,
      name: 'NULL environment matches any environment',
    },
    {
      matches: false,
      name: 'environment-qualified rule does not match a null-environment evaluation',
      rule: { environment: 'ralph' },
    },
    {
      context: { environment: 'ralph' },
      matches: true,
      name: 'equal environment matches',
      rule: { environment: 'ralph' },
    },
    {
      context: { environment: 'ci' },
      matches: false,
      name: 'different environment does not match',
      rule: { environment: 'ralph' },
    },
    {
      matches: true,
      name: 'equal status matches',
      rule: { status: 'PENDING' },
    },
    {
      matches: false,
      name: 'different status does not match',
      rule: { status: 'COMPLETED' },
    },
    {
      matches: true,
      name: 'empty tag_all matches every plan',
      rule: { tagAll: [] },
    },
    {
      matches: true,
      name: 'tag_all subset of effective tags matches',
      rule: { tagAll: ['breakdown', 'github'] },
    },
    {
      matches: false,
      name: 'tag_all superset of effective tags does not match',
      rule: { tagAll: ['breakdown', 'terraform'] },
    },
    {
      matches: false,
      name: 'unknown tag in tag_all degrades gracefully (never matches)',
      rule: { tagAll: ['not-in-any-vocabulary'] },
    },
  ])('$name', ({ context, matches, rule }) => {
    const result = evaluateTagActionRules({ ...baseContext, ...context }, [
      { ...baseRule, ...rule },
    ]);

    expect(result).toHaveLength(matches ? 1 : 0);
    if (matches) {
      expect(result[0]).toMatchObject({
        actionType: TAG_ACTION_TYPES.INJECT_TASK,
        ruleId: 'rule-1',
      });
    }
  });

  test('returns ALL matched actions in input order (no global priority)', () => {
    const rules: TagActionRuleInput[] = [
      { ...baseRule, id: 'rule-a' },
      { ...baseRule, id: 'rule-b', tagAll: ['github'] },
      { ...baseRule, id: 'rule-miss', tagAll: ['terraform'] },
      {
        ...baseRule,
        actionType: TAG_ACTION_TYPES.AVAILABILITY_EXCEPTION,
        id: 'rule-c',
        tagAll: [],
      },
    ];

    const result = evaluateTagActionRules(baseContext, rules);

    expect(result.map((action) => action.ruleId)).toEqual([
      'rule-a',
      'rule-b',
      'rule-c',
    ]);
  });

  test('matchedTags echoes the satisfied tag_all', () => {
    const result = evaluateTagActionRules(baseContext, [
      { ...baseRule, tagAll: ['breakdown', 'github'] },
    ]);

    expect(result[0]?.matchedTags).toEqual(['breakdown', 'github']);
  });

  test('is pure: does not mutate its inputs', () => {
    const rules = [{ ...baseRule }];
    const context = { ...baseContext, effectiveTags: ['breakdown'] };
    const rulesSnapshot = JSON.parse(JSON.stringify(rules));
    const contextSnapshot = JSON.parse(JSON.stringify(context));

    evaluateTagActionRules(context, rules);

    expect(rules).toEqual(rulesSnapshot);
    expect(context).toEqual(contextSnapshot);
  });
});

describe('tag action payload schemas', () => {
  test('inject-task payload defaults placement to first', () => {
    const parsed = injectTaskActionPayloadSchema.parse({
      skillSlug: 'grilling',
    });

    expect(parsed).toEqual({ placement: 'first', skillSlug: 'grilling' });
  });

  test('inject-task payload rejects a non-kebab slug', () => {
    expect(() =>
      injectTaskActionPayloadSchema.parse({ skillSlug: 'Not Valid' }),
    ).toThrow();
  });

  test('inject-task payload rejects unknown keys', () => {
    expect(() =>
      injectTaskActionPayloadSchema.parse({
        skillSlug: 'grilling',
        undo: true,
      }),
    ).toThrow();
  });

  test('availability-exception payload defaults all lists to empty', () => {
    const parsed = availabilityExceptionActionPayloadSchema.parse({});

    expect(parsed).toEqual({
      slugAllow: [],
      slugDeny: [],
      tagAllow: [],
      tagDeny: [],
    });
  });

  test('parseTagActionPayload dispatches on action type', () => {
    expect(
      parseTagActionPayload(TAG_ACTION_TYPES.INJECT_TASK, {
        skillSlug: 'grilling',
      }),
    ).toMatchObject({ skillSlug: 'grilling' });
    expect(() =>
      parseTagActionPayload(TAG_ACTION_TYPES.AVAILABILITY_EXCEPTION, {
        skillSlug: 'grilling',
      }),
    ).toThrow();
  });

  test('isTagActionType accepts only the two v1 action types', () => {
    expect(isTagActionType('inject-task')).toBe(true);
    expect(isTagActionType('availability-exception')).toBe(true);
    expect(isTagActionType('delete-everything')).toBe(false);
  });
});
