// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/rules.new';

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

const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const REPOSITORY_ID = '11111111-1111-4111-8111-111111111111';

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

  test('returns enabled skill slugs, the tag vocabulary and the registered repositories', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        personas: [{ id: 'persona-1', title: 'Reviewer', userId: null }],
        projects: [{ id: 'proj-1', name: 'Platform' }],
        prompts: [{ id: 'prompt-1', title: 'Checklist', userId: 'user-1' }],
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
        workspaceRepositories: [{ id: 'repo-1', name: 'monorepo' }],
      }),
    );

    const result = await loader(loaderArgs());

    expect(result.repositories).toEqual([{ id: 'repo-1', name: 'monorepo' }]);
    expect(result.projects).toEqual([{ id: 'proj-1', name: 'Platform' }]);
    expect(result.skillSlugs).toEqual(['grilling']);
    expect(result.promptOptions).toEqual([
      {
        id: 'prompt-1',
        owner: 'yours',
        promptType: 'prompts',
        title: 'Checklist',
      },
      {
        id: 'persona-1',
        owner: 'system',
        promptType: 'personas',
        title: 'Reviewer',
      },
    ]);
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
          projectId: null,
          repositoryId: null,
          status: null,
          tagAll: ['breakdown'],
          title: 'Grill breakdowns',
        },
      },
    );
  });

  test('forwards an attach-prompt payload verbatim', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );
    const payload = `{"placement":"end","promptId":"prompt-1","promptType":"prompts"}`;

    const formData = new FormData();
    formData.set('title', 'Attach');
    formData.set('actionType', 'attach-prompt');
    formData.set('actionPayloadJson', payload);

    await action(actionArgs(formData));

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      {
        input: expect.objectContaining({
          actionPayloadJson: payload,
          actionType: 'attach-prompt',
        }),
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
          projectId: null,
          repositoryId: null,
          status: null,
          tagAll: [],
          title: 'No tags',
        },
      },
    );
  });

  test('forwards a selected repository id', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );

    const formData = new FormData();
    formData.set('title', 'Repo scoped');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('repositoryId', REPOSITORY_ID);

    await action(actionArgs(formData));

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      {
        input: expect.objectContaining({ repositoryId: REPOSITORY_ID }),
      },
    );
  });

  test('forwards a selected project id', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );

    const formData = new FormData();
    formData.set('title', 'Project scoped');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('projectId', PROJECT_ID);

    await action(actionArgs(formData));

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      { input: expect.objectContaining({ projectId: PROJECT_ID }) },
    );
  });

  test('treats a blank project as all projects', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );

    const formData = new FormData();
    formData.set('title', 'All projects');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('projectId', '');

    await action(actionArgs(formData));

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      { input: expect.objectContaining({ projectId: null }) },
    );
  });

  test('rejects a project id that is not a UUID', async () => {
    const formData = new FormData();
    formData.set('title', 'Bad project');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('projectId', 'not-a-uuid');

    const result = await action(actionArgs(formData));

    expect(result).toEqual({ error: 'Project must be a valid id.' });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('treats a blank repository as all repositories', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );

    const formData = new FormData();
    formData.set('title', 'All repos');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('repositoryId', '');

    await action(actionArgs(formData));

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      { input: expect.objectContaining({ repositoryId: null }) },
    );
  });

  test('rejects a repository id that is not a UUID', async () => {
    const formData = new FormData();
    formData.set('title', 'Bad repo');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('repositoryId', 'not-a-uuid');

    const result = await action(actionArgs(formData));

    expect(result).toEqual({ error: 'Repository must be a valid id.' });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
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
