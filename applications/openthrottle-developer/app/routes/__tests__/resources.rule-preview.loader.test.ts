// @vitest-environment node
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/resources.rule-preview';

vi.mock('~/routing/rules/utils/rule-preview.server', () => ({
  loadRulePreview: vi.fn(),
}));

const { loadRulePreview } =
  await import('~/routing/rules/utils/rule-preview.server');
const { loader } = await import('../resources.rule-preview');

const mockLoad = vi.mocked(loadRulePreview);

describe('routes/resources.rule-preview loader', () => {
  beforeEach(() => {
    mockLoad.mockReset();
  });

  test('parses the query string into the dry-run request', async () => {
    mockLoad.mockResolvedValue({ kind: 'error', message: 'x' });

    await loader(
      createLoaderArgs<Route.LoaderArgs>({
        url: 'http://localhost/resources/rule-preview?actionType=inject-task&status=PENDING&tagAll=a&tagAll=b&evaluateEnvironment=ci',
      }),
    );

    expect(mockLoad).toHaveBeenCalledWith(expect.anything(), {
      evaluateEnvironment: 'ci',
      match: {
        actionType: 'inject-task',
        environment: null,
        repositoryId: null,
        status: 'PENDING',
        tagAll: ['a', 'b'],
      },
    });
  });

  test('returns what the dry run returns', async () => {
    const state = { kind: 'error', message: 'boom' } as const;
    mockLoad.mockResolvedValue(state);

    await expect(
      loader(
        createLoaderArgs<Route.LoaderArgs>({
          url: 'http://localhost/resources/rule-preview?actionType=inject-task',
        }),
      ),
    ).resolves.toEqual(state);
  });
});
