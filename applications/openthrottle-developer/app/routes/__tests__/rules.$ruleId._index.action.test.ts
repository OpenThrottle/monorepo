// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/rules.$ruleId._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  RuleDetailLoaderDocument,
  RulesDeleteTagActionRuleDocument,
  RulesUpsertTagActionRuleDocument,
} = await import('~/__generated__/graphql');
const { action, loader } = await import('../rules.$ruleId._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const rule = {
  actionPayloadJson: '{"skillSlug":"grilling"}',
  actionType: 'inject-task',
  enabled: true,
  environment: null,
  id: 'rule-1',
  repositoryId: null,
  status: 'PENDING',
  tagAll: ['breakdown'],
  title: 'Grill breakdowns',
};

const loaderArgs = (ruleId: string): Route.LoaderArgs => {
  const request = new Request(`http://localhost/rules/${ruleId}`);
  return {
    context: createTestRouterContext(),
    params: { ruleId },
    pattern: '/rules/:ruleId',
    request,
    url: new URL(request.url),
  };
};

const actionArgs = (entries: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    body.set(key, value);
  }
  const request = new Request('http://localhost/rules/rule-1', {
    body,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { ruleId: 'rule-1' },
    pattern: '/rules/:ruleId',
    request,
    url: new URL(request.url),
  };
};

describe('routes/rules.$ruleId._index loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('loads the rule, its ledger and the repositories by rule id', async () => {
    const ledger = [{ id: 'app-1', planId: 'plan-1', state: 'flagged' }];
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        projects: [{ id: 'proj-1', name: 'Platform' }],
        ruleApplicationsForRule: ledger,
        tagActionRule: rule,
        workspaceRepositories: [{ id: 'repo-1', name: 'monorepo' }],
      }),
    );

    const result = await loader(loaderArgs('rule-1'));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      RuleDetailLoaderDocument,
      { id: 'rule-1' },
    );
    expect(result.applications).toEqual(ledger);
    expect(result.repositories).toEqual([{ id: 'repo-1', name: 'monorepo' }]);
    expect(result.projects).toEqual([{ id: 'proj-1', name: 'Platform' }]);
    expect(result.rule).toMatchObject({ id: 'rule-1' });
  });

  test('returns a null rule when the query resolves null', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        projects: [],
        ruleApplicationsForRule: [],
        tagActionRule: null,
        workspaceRepositories: [],
      }),
    );

    const result = await loader(loaderArgs('rule-1'));

    expect(result.rule).toBeNull();
    expect(result.applications).toEqual([]);
  });

  test('skips the query for a blank rule id', async () => {
    const result = await loader(loaderArgs(''));

    expect(result.rule).toBeNull();
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe('routes/rules.$ruleId._index action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue({});
  });

  test('deletes the rule and redirects to the list', async () => {
    const result = await action(
      actionArgs({ id: 'rule-1', intent: 'deleteRule' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      RulesDeleteTagActionRuleDocument,
      { input: { id: 'rule-1' } },
    );
    expect(result).toBeInstanceOf(Response);
    expect(result instanceof Response && result.headers.get('Location')).toBe(
      '/rules',
    );
  });

  test('toggles enabled without redirecting', async () => {
    const result = await action(
      actionArgs({ intent: 'toggleEnabled', rule: JSON.stringify(rule) }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      { input: expect.objectContaining({ enabled: false, id: 'rule-1' }) },
    );
    expect(result).toEqual({ ruleSaved: true });
  });

  test('surfaces a mutation failure as ruleError', async () => {
    mockExecute.mockRejectedValue(new Error('boom'));

    const result = await action(
      actionArgs({ id: 'rule-1', intent: 'deleteRule' }),
    );

    expect(result).toEqual({ ruleError: 'boom' });
  });

  test('rejects an unknown intent', async () => {
    const result = await action(actionArgs({ intent: 'nope' }));

    expect(result).toHaveProperty('ruleError');
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
