// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Route } from '@/app/routes/+types/rules.new';
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
const { action, loader } = await import('../rules.new');

const mockExecuteGraphqlWithAuth = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const loaderArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/rules/new');
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/rules/new',
    request,
    url: new URL(request.url),
  };
};

const actionArgs = (formData: FormData): Route.ActionArgs => {
  const request = new Request('http://localhost/rules/new', {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/rules/new',
    request,
    url: new URL(request.url),
  };
};

describe('routes/rules.new loader', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('returns enabled skill slugs and the tag vocabulary', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        skillAvailability: {
          skills: [
            { effectiveDisableModelInvocation: false, slug: 'grilling' },
            { effectiveDisableModelInvocation: true, slug: 'hidden' },
          ],
        },
        skillTagVocabulary: {
          tags: [{ dimension: 'phase', tag: 'breakdown' }],
        },
        tagActionRules: [],
      }),
    );

    const result = await loader(loaderArgs());

    expect(result.skillSlugs).toEqual(['grilling']);
    expect(result.vocabulary).toEqual([
      { dimension: 'phase', tag: 'breakdown' },
    ]);
  });
});

describe('routes/rules.new action', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('builds the upsert input (with title) and redirects to /rules', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );

    const formData = new FormData();
    formData.set('title', 'Grill breakdowns');
    formData.set('actionType', 'inject-task');
    formData.set(
      'actionPayloadJson',
      '{"placement":"first","skillSlug":"grilling"}',
    );
    formData.set('enabled', 'true');
    formData.set('status', '');
    formData.set('environment', '');
    formData.append('tagAll', 'breakdown');

    const result = await action(actionArgs(formData));

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
          status: null,
          tagAll: ['breakdown'],
          title: 'Grill breakdowns',
        },
      },
    );
  });

  test('defaults tagAll to an empty list when no tags are submitted', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );

    const formData = new FormData();
    formData.set('title', 'No tags');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');

    await action(actionArgs(formData));

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      {
        input: {
          actionPayloadJson: '{}',
          actionType: 'inject-task',
          enabled: true,
          environment: null,
          status: null,
          tagAll: [],
          title: 'No tags',
        },
      },
    );
  });

  test('rejects an empty title without calling the mutation', async () => {
    const formData = new FormData();
    formData.set('title', '   ');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');

    const result = await action(actionArgs(formData));

    expect(result).toEqual({ error: 'Title is required.' });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('surfaces a server error as { error }', async () => {
    mockExecuteGraphqlWithAuth.mockRejectedValue(
      new Error('Rule title must not be empty.'),
    );

    const formData = new FormData();
    formData.set('title', 'x');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{"skillSlug":"grilling"}');

    const result = await action(actionArgs(formData));

    expect(result).toEqual({ error: 'Rule title must not be empty.' });
  });
});
