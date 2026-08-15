// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Route } from '@/app/routes/+types/skills.vocabulary';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { SkillAvailabilityAuthoringVocabularyDocument } =
  await import('~/__generated__/graphql');
const { loader } = await import('../skills.vocabulary');

const mockExecuteGraphqlWithAuth = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const loaderArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/skills/vocabulary');
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/skills/vocabulary',
    request,
    url: new URL(request.url),
  };
};

describe('routes/skills.vocabulary loader', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('maps the SkillAvailabilityAuthoringVocabulary response to { id, tag }[]', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        skillTagVocabulary: {
          tags: [
            { id: 't1', tag: 'github' },
            { id: 't2', tag: 'pr-review' },
          ],
          totalCount: 2,
        },
      }),
    );

    const result = await loader(loaderArgs());

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      SkillAvailabilityAuthoringVocabularyDocument,
    );
    expect(result.vocabulary).toEqual([
      { id: 't1', tag: 'github' },
      { id: 't2', tag: 'pr-review' },
    ]);
  });

  test('returns an empty vocabulary when the workspace has no tags', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        skillTagVocabulary: { tags: [], totalCount: 0 },
      }),
    );

    const result = await loader(loaderArgs());

    expect(result.vocabulary).toEqual([]);
  });
});
