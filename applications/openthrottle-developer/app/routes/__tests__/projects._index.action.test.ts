// @vitest-environment node
import { createActionArgs } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/projects._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { ProjectSetFavoriteDocument } = await import('~/__generated__/graphql');
const { action } = await import('../projects._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const actionArgs = (body: Record<string, string>): Route.ActionArgs => {
  return createActionArgs<Route.ActionArgs>({
    body,
    url: 'http://localhost/projects',
  });
};

describe('projects index route action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('dispatches the setProjectFavorite intent', async () => {
    mockExecute.mockResolvedValue({
      setProjectFavorite: { favorite: true, projectId: 'proj-2' },
    });
    const result = await action(
      actionArgs({
        favorite: 'true',
        intent: 'setProjectFavorite',
        projectId: 'proj-2',
      }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      ProjectSetFavoriteDocument,
      { favorite: true, projectId: 'proj-2' },
    );
    expect(result).toEqual({ favorite: true, projectId: 'proj-2' });
  });

  test('ignores an unknown intent', async () => {
    const result = await action(actionArgs({ intent: 'nope' }));

    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
