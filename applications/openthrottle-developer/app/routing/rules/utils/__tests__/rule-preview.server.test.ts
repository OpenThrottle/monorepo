// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loadRulePreview, loadRulePreviewForRule } =
  await import('../rule-preview.server');

const execute = vi.mocked(executeGraphqlWithAuth);
const request = new Request('http://localhost/resources/rule-preview');

const preview = {
  cap: 500,
  environment: null,
  evaluated: 2,
  matched: [],
  matchedCount: 0,
  nonMatching: [],
  specificity: 0,
  truncated: false,
};

describe('loadRulePreview', () => {
  beforeEach(() => {
    execute.mockReset();
  });

  test('sends only the match fields (placeholder title and payload) and the evaluation environment', async () => {
    execute.mockResolvedValue({ previewTagActionRule: preview });

    const state = await loadRulePreview(request, {
      evaluateEnvironment: 'ci',
      match: {
        actionType: 'inject-task',
        environment: null,
        repositoryId: 'repo-1',
        status: null,
        tagAll: ['spike'],
      },
    });

    expect(state).toEqual({ kind: 'ready', preview });
    expect(execute).toHaveBeenCalledWith(
      request,
      expect.anything(),
      expect.objectContaining({
        environment: 'ci',
        input: expect.objectContaining({
          actionPayloadJson: '{}',
          actionType: 'inject-task',
          repositoryId: 'repo-1',
          tagAll: ['spike'],
        }),
      }),
    );
  });

  test('degrades a failure to an error state', async () => {
    execute.mockRejectedValue(new Error('server down'));

    const state = await loadRulePreview(request, {
      evaluateEnvironment: null,
      match: {
        actionType: 'inject-task',
        environment: null,
        repositoryId: null,
        status: null,
        tagAll: [],
      },
    });

    expect(state).toEqual({ kind: 'error', message: 'server down' });
  });
});

describe('loadRulePreviewForRule', () => {
  test('returns null without a rule and never calls the server', async () => {
    execute.mockReset();

    await expect(
      loadRulePreviewForRule(request, null, null),
    ).resolves.toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });
});
