import { describe, expect, it, test } from 'vitest';

import type {
  TagActionEvaluationContext,
  TagActionRuleInput,
} from '../tag-actions.ts';
import {
  attachPromptActionPayloadSchema,
  availabilityExceptionActionPayloadSchema,
  evaluateTagActionRules,
  injectTaskActionPayloadSchema,
  isTagActionType,
  parseTagActionPayload,
  TAG_ACTION_TYPES,
} from '../tag-actions.ts';

const baseRule: TagActionRuleInput = {
  actionPayload: { skillSlug: 'grilling' },
  actionType: TAG_ACTION_TYPES.INJECT_TASK,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  enabled: true,
  environment: null,
  id: 'rule-1',
  projectId: null,
  repositoryId: null,
  status: null,
  tagAll: ['breakdown'],
};

const baseContext: TagActionEvaluationContext = {
  effectiveTags: ['breakdown', 'github'],
  environment: null,
  planStatus: 'PENDING',
  projectId: 'project-1',
  repositoryId: 'repo-1',
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
      matches: true,
      name: 'NULL repositoryId matches any repository',
      rule: { repositoryId: null },
    },
    {
      matches: true,
      name: 'equal repositoryId matches',
      rule: { repositoryId: 'repo-1' },
    },
    {
      matches: false,
      name: 'different repositoryId does not match',
      rule: { repositoryId: 'repo-2' },
    },
    {
      context: { repositoryId: null },
      matches: false,
      name: 'repository-scoped rule does not match a repository-less plan',
      rule: { repositoryId: 'repo-1' },
    },
    {
      context: { repositoryId: null },
      matches: true,
      name: 'unscoped rule matches a repository-less plan',
    },
    {
      context: { environment: 'headless' },
      matches: true,
      name: 'NULL environment matches any environment',
    },
    {
      matches: false,
      name: 'environment-qualified rule does not match a null-environment evaluation',
      rule: { environment: 'headless' },
    },
    {
      context: { environment: 'headless' },
      matches: true,
      name: 'equal environment matches',
      rule: { environment: 'headless' },
    },
    {
      context: { environment: 'ci' },
      matches: false,
      name: 'different environment does not match',
      rule: { environment: 'headless' },
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

  test('carries the rule scope, project included, for ranking', () => {
    const result = evaluateTagActionRules(baseContext, [
      { ...baseRule, projectId: 'project-1', repositoryId: 'repo-1' },
    ]);

    expect(result[0]?.scope).toEqual({
      environment: null,
      projectId: 'project-1',
      repositoryId: 'repo-1',
      status: null,
      tagAll: ['breakdown'],
    });
  });

  test('is pure: does not mutate its inputs', () => {
    const rules = [{ ...baseRule }];
    const context = { ...baseContext, effectiveTags: ['breakdown'] };
    const rulesSnapshot = structuredClone(rules);
    const contextSnapshot = structuredClone(context);

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

/**
 * @description Unit tests for the inject-task action payload schema: the
 * placement enum (first/last/before/after), anchor requirement + exclusivity,
 * and default behavior.
 */

describe('injectTaskActionPayloadSchema', () => {
  it('defaults placement to first when omitted', () => {
    const parsed = injectTaskActionPayloadSchema.parse({
      skillSlug: 'grilling',
    });
    expect(parsed.placement).toBe('first');
    expect(parsed.anchor).toBeUndefined();
  });

  it('accepts first/last without an anchor', () => {
    for (const placement of ['first', 'last'] as const) {
      expect(() =>
        injectTaskActionPayloadSchema.parse({
          placement,
          skillSlug: 'grilling',
        }),
      ).not.toThrow();
    }
  });

  it('rejects before/after without an anchor', () => {
    for (const placement of ['before', 'after'] as const) {
      expect(() =>
        injectTaskActionPayloadSchema.parse({
          placement,
          skillSlug: 'grilling',
        }),
      ).toThrow(/requires an anchor/);
    }
  });

  it('accepts before/after with a single-field anchor', () => {
    const parsed = injectTaskActionPayloadSchema.parse({
      anchor: { skillSlug: 'lint' },
      placement: 'after',
      skillSlug: 'grilling',
    });
    expect(parsed.placement).toBe('after');
    expect(parsed.anchor).toEqual({ skillSlug: 'lint' });
  });

  it('rejects an anchor with more than one field set', () => {
    expect(() =>
      injectTaskActionPayloadSchema.parse({
        anchor: { skillSlug: 'lint', titleMatch: 'build' },
        placement: 'before',
        skillSlug: 'grilling',
      }),
    ).toThrow(/exactly one/);
  });

  it('rejects an anchor when placement is first/last', () => {
    expect(() =>
      injectTaskActionPayloadSchema.parse({
        anchor: { skillSlug: 'lint' },
        placement: 'first',
        skillSlug: 'grilling',
      }),
    ).toThrow(/only valid with placement/);
  });

  it('rejects unknown keys (strict)', () => {
    expect(() =>
      injectTaskActionPayloadSchema.parse({
        bogus: true,
        skillSlug: 'grilling',
      }),
    ).toThrow();
  });

  it('is reachable through parseTagActionPayload by action type', () => {
    const parsed = parseTagActionPayload(TAG_ACTION_TYPES.INJECT_TASK, {
      anchor: { taskId: '00000000-0000-4000-8000-000000000001' },
      placement: 'before',
      skillSlug: 'grilling',
    });
    expect(parsed).toMatchObject({ placement: 'before' });
  });
});

describe('attachPromptActionPayloadSchema', () => {
  const promptId = '11111111-1111-4111-8111-111111111111';

  test('accepts a promptId reference and defaults placement to end', () => {
    expect(
      attachPromptActionPayloadSchema.parse({
        promptId,
        promptType: 'prompts',
      }),
    ).toEqual({ placement: 'end', promptId, promptType: 'prompts' });
  });

  test('accepts a filePath reference for a persona', () => {
    expect(
      attachPromptActionPayloadSchema.safeParse({
        filePath: '.agents/personas/reviewer.md',
        placement: 'start',
        promptType: 'personas',
      }).success,
    ).toBe(true);
  });

  describe('exactly one of promptId or filePath', () => {
    test('rejects both', () => {
      expect(
        attachPromptActionPayloadSchema.safeParse({
          filePath: 'a.md',
          promptId,
          promptType: 'prompts',
        }).success,
      ).toBe(false);
    });

    test('rejects neither', () => {
      expect(
        attachPromptActionPayloadSchema.safeParse({ promptType: 'prompts' })
          .success,
      ).toBe(false);
    });

    test('rejects a blank filePath', () => {
      expect(
        attachPromptActionPayloadSchema.safeParse({
          filePath: '   ',
          promptType: 'prompts',
        }).success,
      ).toBe(false);
    });
  });

  test.each(['rules', 'skills', 'agents', 'commands'])(
    'rejects promptType %s',
    (promptType) => {
      expect(
        attachPromptActionPayloadSchema.safeParse({ promptId, promptType })
          .success,
      ).toBe(false);
    },
  );

  test('rejects unknown keys', () => {
    expect(
      attachPromptActionPayloadSchema.safeParse({
        extra: true,
        promptId,
        promptType: 'prompts',
      }).success,
    ).toBe(false);
  });

  test('is registered with parseTagActionPayload and isTagActionType', () => {
    expect(isTagActionType(TAG_ACTION_TYPES.ATTACH_PROMPT)).toBe(true);
    expect(
      parseTagActionPayload(TAG_ACTION_TYPES.ATTACH_PROMPT, {
        promptId,
        promptType: 'personas',
      }),
    ).toEqual({ placement: 'end', promptId, promptType: 'personas' });
  });
});
