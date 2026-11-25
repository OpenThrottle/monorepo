// @vitest-environment node
import { createActionArgs } from '@openthrottle/react-router-testing';
import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { ProjectSetFavoriteDocument } = await import('~/__generated__/graphql');
const { runSetProjectFavoriteIntent } = await import('../projectFavorite');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

/** Runs the intent the way a route action does: on a POSTed form. */
const runIntent = async (
  body: Record<string, string>,
): ReturnType<typeof runSetProjectFavoriteIntent> => {
  const { request } = createActionArgs<ActionFunctionArgs>({
    body,
    url: 'http://localhost/projects',
  });
  const formData = await request.clone().formData();

  return runSetProjectFavoriteIntent(request, formData);
};

describe('projects/actions/projectFavorite', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('runSetProjectFavoriteIntent', () => {
    test('sends the favorite flag and returns the server state', async () => {
      mockExecute.mockResolvedValue({
        setProjectFavorite: { favorite: true, projectId: 'proj-1' },
      });
      const result = await runIntent({
        favorite: 'true',
        intent: 'setProjectFavorite',
        projectId: 'proj-1',
      });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.anything(),
        ProjectSetFavoriteDocument,
        { favorite: true, projectId: 'proj-1' },
      );
      expect(result).toEqual({ favorite: true, projectId: 'proj-1' });
    });

    test('returns an error without calling the API when projectId is missing', async () => {
      const result = await runIntent({ favorite: 'true' });

      expect(mockExecute).not.toHaveBeenCalled();
      expect(result).toHaveProperty('projectFavoriteError');
    });

    test('reports a failed request as projectFavoriteError', async () => {
      mockExecute.mockRejectedValue(new Error('boom'));
      const result = await runIntent({
        favorite: 'false',
        projectId: 'proj-1',
      });

      expect(result).toEqual({ projectFavoriteError: 'boom' });
    });
  });
});
