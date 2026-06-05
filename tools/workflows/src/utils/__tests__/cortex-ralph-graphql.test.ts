/**
 * @description Tests for GraphQL transport helpers in cortex-ralph-graphql.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetPlanDocument } from '@openthrottle/openthrottle-agentic-ralph';

const executeWorkflowGraphqlV2Mock = vi.hoisted(() => vi.fn());

vi.mock('@openthrottle/openthrottle-agentic-ralph', async () => {
  const actual = await vi.importActual<
    typeof import('@openthrottle/openthrottle-agentic-ralph')
  >('@openthrottle/openthrottle-agentic-ralph');

  return {
    ...actual,
    executeWorkflowGraphqlV2: executeWorkflowGraphqlV2Mock,
  };
});

const planRow = {
  author: 'visormatt',
  category: 'infra',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: null,
  id: 'plan-1',
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('cortex-ralph-graphql', () => {
  beforeEach(() => {
    executeWorkflowGraphqlV2Mock.mockReset();
  });

  it('ensureCortexReachableGraphql throws when database is unreachable', async () => {
    executeWorkflowGraphqlV2Mock.mockResolvedValue({
      serverHealth: {
        api: 'ok',
        database: 'unreachable',
        redis: 'ok',
        websocket: 'ok',
      },
    });

    const { ensureCortexReachableGraphql } =
      await import('../cortex-ralph-graphql.js');

    await expect(ensureCortexReachableGraphql()).rejects.toThrow(
      /database is unreachable/,
    );
  });

  it('updatePlanStatusGraphql returns null when plan is already IN_PROGRESS', async () => {
    executeWorkflowGraphqlV2Mock.mockImplementation(async (document) => {
      if (document === GetPlanDocument) {
        return { plan: { ...planRow, status: 'IN_PROGRESS' } };
      }

      return {};
    });

    const { updatePlanStatusGraphql } =
      await import('../cortex-ralph-graphql.js');

    const row = await updatePlanStatusGraphql('plan-1', 'IN_PROGRESS');

    expect(row).toBeNull();
    expect(executeWorkflowGraphqlV2Mock).toHaveBeenCalledTimes(1);
  });
});
