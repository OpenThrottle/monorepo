// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Route } from '@/app/routes/+types/rules.$ruleId.edit';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { RulesUpsertTagActionRuleDocument } =
  await import('~/__generated__/graphql');
const { action, loader } = await import('../rules.$ruleId.edit');

const mockExecuteGraphqlWithAuth = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const RULE = {
  actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
  actionType: 'inject-task',
  enabled: true,
  environment: null,
  id: 'rule-1',
  status: 'PENDING',
  tagAll: ['breakdown'],
  title: 'Grill breakdowns',
};

const loaderArgs = (ruleId: string): Route.LoaderArgs => {
  const request = new Request(`http://localhost/rules/${ruleId}/edit`);
  return {
    context: createTestRouterContext(),
    params: { ruleId },
    pattern: '/rules/:ruleId/edit',
    request,
    url: new URL(request.url),
  };
};

const actionArgs = (ruleId: string, formData: FormData): Route.ActionArgs => {
  const request = new Request(`http://localhost/rules/${ruleId}/edit`, {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { ruleId },
    pattern: '/rules/:ruleId/edit',
    request,
    url: new URL(request.url),
  };
};

describe('routes/rules.$ruleId.edit loader', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('returns the rule when found', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        skillAvailability: { skills: [] },
        skillTagVocabulary: { tags: [] },
        tagActionRule: RULE,
      }),
    );

    const result = await loader(loaderArgs('rule-1'));

    expect(result.rule).toMatchObject({
      id: 'rule-1',
      title: 'Grill breakdowns',
    });
  });

  test('returns a null rule (not-found) when the query resolves null', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        skillAvailability: { skills: [] },
        skillTagVocabulary: { tags: [] },
        tagActionRule: null,
      }),
    );

    const result = await loader(loaderArgs('missing'));

    expect(result.rule).toBeNull();
  });
});

describe('routes/rules.$ruleId.edit action', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('rejects when the form id does not match the route param', async () => {
    const formData = new FormData();
    formData.set('id', 'other');
    formData.set('title', 'x');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{"skillSlug":"grilling"}');

    const result = await action(actionArgs('rule-1', formData));

    expect(result).toEqual({ error: 'Rule id does not match.' });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('upserts with the route id and redirects to /rules', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );

    const formData = new FormData();
    formData.set('id', 'rule-1');
    formData.set('title', 'Grill breakdowns');
    formData.set('actionType', 'inject-task');
    formData.set(
      'actionPayloadJson',
      '{"placement":"first","skillSlug":"grilling"}',
    );
    formData.set('enabled', 'true');
    formData.set('status', 'PENDING');
    formData.set('environment', '');
    formData.append('tagAll', 'breakdown');

    const result = await action(actionArgs('rule-1', formData));

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      throw new Error('expected a redirect Response');
    }
    expect(result.headers.get('Location')).toBe('/rules');
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      {
        input: {
          actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
          actionType: 'inject-task',
          enabled: true,
          environment: null,
          id: 'rule-1',
          status: 'PENDING',
          tagAll: ['breakdown'],
          title: 'Grill breakdowns',
        },
      },
    );
  });
});
