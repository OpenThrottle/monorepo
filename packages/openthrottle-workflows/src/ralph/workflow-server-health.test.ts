import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetServerHealthDocument } from '../__generated__/graphql.js';
import { fetchWorkflowServerHealth } from './workflow-server-health.js';
import { executeWorkflowGraphql } from './workflow-graphql.js';

vi.mock('./workflow-graphql.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./workflow-graphql.js')>();

  return {
    ...actual,
    executeWorkflowGraphql: vi.fn(),
  };
});

const mockedExecute = vi.mocked(executeWorkflowGraphql);

describe('fetchWorkflowServerHealth', () => {
  beforeEach(() => {
    mockedExecute.mockReset();
  });

  it('delegates to executeWorkflowGraphql with GetServerHealthDocument and empty variables', async () => {
    mockedExecute.mockResolvedValue({
      data: {
        serverHealth: {
          api: 'ok',
          database: 'ok',
          redis: 'ok',
          websocket: 'ok',
        },
      },
      ok: true,
    });

    const config = {
      graphqlUrl: 'http://localhost:6021/graphql',
      token: undefined,
    };

    const result = await fetchWorkflowServerHealth(config);

    expect(mockedExecute).toHaveBeenCalledTimes(1);
    expect(mockedExecute).toHaveBeenCalledWith(
      config,
      GetServerHealthDocument,
      {},
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.serverHealth.api).toBe('ok');
    }
  });
});
