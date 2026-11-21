// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/rules.$ruleId.edit';

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

const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const REPOSITORY_ID = '11111111-1111-4111-8111-111111111111';

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
        personas: [{ id: 'persona-1', title: 'Reviewer', userId: null }],
        projects: [{ id: 'proj-1', name: 'Platform' }],
        prompts: [{ id: 'prompt-1', title: 'Checklist', userId: 'user-1' }],
        skillAvailability: { skills: [] },
        skillTagVocabulary: { tags: [] },
        tagActionRule: RULE,
        workspaceRepositories: [{ id: 'repo-1', name: 'monorepo' }],
      }),
    );

    const result = await loader(loaderArgs('rule-1'));

    expect(result.repositories).toEqual([{ id: 'repo-1', name: 'monorepo' }]);
    expect(result.projects).toEqual([{ id: 'proj-1', name: 'Platform' }]);
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
    expect(result.rule).toMatchObject({
      id: 'rule-1',
      title: 'Grill breakdowns',
    });
  });

  test('returns an attach-prompt rule untouched so the form can pre-select it', async () => {
    const attachRule = {
      ...RULE,
      actionPayloadJson: `{"placement":"start","promptId":"prompt-1","promptType":"prompts"}`,
      actionType: 'attach-prompt',
    };
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        personas: [],
        projects: [],
        prompts: [{ id: 'prompt-1', title: 'Checklist', userId: null }],
        skillAvailability: { skills: [] },
        skillTagVocabulary: { tags: [] },
        tagActionRule: attachRule,
        workspaceRepositories: [],
      }),
    );

    const result = await loader(loaderArgs('rule-1'));

    expect(result.rule).toMatchObject({
      actionPayloadJson: attachRule.actionPayloadJson,
      actionType: 'attach-prompt',
    });
    expect(result.promptOptions).toEqual([
      {
        id: 'prompt-1',
        owner: 'system',
        promptType: 'prompts',
        title: 'Checklist',
      },
    ]);
  });

  test('returns a null rule (not-found) when the query resolves null', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        personas: [],
        projects: [],
        prompts: [],
        skillAvailability: { skills: [] },
        skillTagVocabulary: { tags: [] },
        tagActionRule: null,
        workspaceRepositories: [],
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
          projectId: null,
          repositoryId: null,
          status: 'PENDING',
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
    const payload = `{"placement":"start","promptId":"prompt-1","promptType":"personas"}`;

    const formData = new FormData();
    formData.set('id', 'rule-1');
    formData.set('title', 'Attach');
    formData.set('actionType', 'attach-prompt');
    formData.set('actionPayloadJson', payload);

    await action(actionArgs('rule-1', formData));

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

  test('forwards a selected repository id on edit', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        upsertTagActionRule: { id: 'rule-1' },
      }),
    );

    const formData = new FormData();
    formData.set('id', 'rule-1');
    formData.set('title', 'Grill breakdowns');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('repositoryId', REPOSITORY_ID);

    await action(actionArgs('rule-1', formData));

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
    formData.set('id', 'rule-1');
    formData.set('title', 'Project scoped');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('projectId', PROJECT_ID);

    await action(actionArgs('rule-1', formData));

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
    formData.set('id', 'rule-1');
    formData.set('title', 'All projects');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('projectId', '');

    await action(actionArgs('rule-1', formData));

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      { input: expect.objectContaining({ projectId: null }) },
    );
  });

  test('rejects a project id that is not a UUID', async () => {
    const formData = new FormData();
    formData.set('id', 'rule-1');
    formData.set('title', 'Bad project');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('projectId', 'not-a-uuid');

    const result = await action(actionArgs('rule-1', formData));

    expect(result).toEqual({ error: 'Project must be a valid id.' });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('rejects a repository id that is not a UUID', async () => {
    const formData = new FormData();
    formData.set('id', 'rule-1');
    formData.set('title', 'Bad repo');
    formData.set('actionType', 'inject-task');
    formData.set('actionPayloadJson', '{}');
    formData.set('repositoryId', 'not-a-uuid');

    const result = await action(actionArgs('rule-1', formData));

    expect(result).toEqual({ error: 'Repository must be a valid id.' });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });
});
