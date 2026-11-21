// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/rules._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { RulesDeleteTagActionRuleDocument, RulesUpsertTagActionRuleDocument } =
  await import('~/__generated__/graphql');
const { action } = await import('../rules._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const actionArgs = (entries: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    body.set(key, value);
  }
  const request = new Request('http://localhost/rules', {
    body,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/rules',
    request,
    url: new URL(request.url),
  };
};

const rule = {
  actionPayloadJson: '{"skillSlug":"grilling"}',
  actionType: 'inject-task',
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  environment: null,
  id: 'rule-1',
  projectId: 'proj-1',
  repositoryId: 'repo-1',
  status: 'PENDING',
  tagAll: ['breakdown'],
  title: 'Grill breakdowns',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
};

describe('routes/rules._index action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue({});
  });

  test('deletes a rule by id', async () => {
    const result = await action(
      actionArgs({ id: 'rule-1', intent: 'deleteRule' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      RulesDeleteTagActionRuleDocument,
      { input: { id: 'rule-1' } },
    );
    expect(result).toEqual({ ruleSaved: true });
  });

  test('toggles enabled from a valid JSON rule payload', async () => {
    const result = await action(
      actionArgs({ intent: 'toggleEnabled', rule: JSON.stringify(rule) }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      RulesUpsertTagActionRuleDocument,
      {
        input: {
          actionPayloadJson: rule.actionPayloadJson,
          actionType: rule.actionType,
          enabled: false,
          environment: null,
          id: 'rule-1',
          projectId: 'proj-1',
          repositoryId: 'repo-1',
          status: 'PENDING',
          tagAll: ['breakdown'],
          title: 'Grill breakdowns',
        },
      },
    );
    expect(result).toEqual({ ruleSaved: true });
  });

  test.each([
    ['malformed JSON', { intent: 'toggleEnabled', rule: '{not json' }],
    ['a JSON array', { intent: 'toggleEnabled', rule: '[]' }],
    [
      'a rule with the wrong shape',
      { intent: 'toggleEnabled', rule: JSON.stringify({ id: 1 }) },
    ],
    ['a missing rule', { intent: 'toggleEnabled' }],
    ['a missing id', { intent: 'deleteRule' }],
    ['an unknown intent', { id: 'rule-1', intent: 'explode' }],
    ['a missing intent', { id: 'rule-1' }],
  ])('returns a structured ruleError for %s', async (_label, entries) => {
    const result = await action(actionArgs(entries));

    expect(result).toEqual({ ruleError: expect.any(String) });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('returns the thrown message when the mutation fails', async () => {
    mockExecute.mockRejectedValue(new Error('boom'));

    const result = await action(
      actionArgs({ id: 'rule-1', intent: 'deleteRule' }),
    );

    expect(result).toEqual({ ruleError: 'boom' });
  });
});
