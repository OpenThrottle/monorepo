// @vitest-environment node
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/resources.background-activities';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../resources.background-activities');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const loaderArgs = (): Route.LoaderArgs => {
  return createLoaderArgs<Route.LoaderArgs>({
    url: 'http://localhost/resources/background-activities',
  });
};

const ACTIVITY = {
  done: 40,
  etaSeconds: 60,
  id: 'embeddings_backfill:code',
  label: 'Embedding code chunks',
  startedAt: '2026-11-15T18:00:00.000Z',
  status: 'running',
  total: 100,
};

describe('routes/resources.background-activities loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the server list', async () => {
    mockExecute.mockResolvedValue({ backgroundActivities: [ACTIVITY] });

    await expect(loader(loaderArgs())).resolves.toEqual({
      activities: [ACTIVITY],
    });
  });

  test('reads a failed request as idle', async () => {
    mockExecute.mockRejectedValue(new Error('API down'));

    await expect(loader(loaderArgs())).resolves.toEqual({ activities: [] });
  });
});
