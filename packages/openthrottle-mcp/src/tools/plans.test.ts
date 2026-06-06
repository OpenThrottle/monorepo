/**
 * @description Handler tests for plan MCP tools (create and list/search groups) with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPlanToolHandler,
  listPlansByStatusToolHandler,
} from './plans.js';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

describe('createPlanToolHandler', () => {
  const serviceAccountToken = '***REMOVED-OT-TOKEN***';

  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await createPlanToolHandler({
        category: 'maintenance',
        title: 'Improve test coverage',
      } as Parameters<typeof createPlanToolHandler>[0]);

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/Invalid arguments[\s\S]*author/i) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when auth token is unset', () => {
    it('returns an auth error without calling GraphQL', async () => {
      const result = await createPlanToolHandler({
        author: 'visormatt',
        category: 'maintenance',
        title: 'Improve test coverage',
      });

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/OPENTHROTTLE_MCP_AUTH_TOKEN/) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns a plan', () => {
    it('returns structured plan content', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
      const plan = {
        author: 'visormatt',
        category: 'maintenance',
        id: 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e',
        status: 'PENDING',
        title: 'Improve test coverage',
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ createPlan: plan });

      const result = await createPlanToolHandler({
        author: 'visormatt',
        category: 'maintenance',
        title: 'Improve test coverage',
      });

      expect(result).toMatchObject({
        structuredContent: { plan },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            author: 'visormatt',
            category: 'maintenance',
            title: 'Improve test coverage',
          },
        },
      );
    });
  });

  describe('when GraphQL returns no plan', () => {
    it('returns a no-result error', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ createPlan: null });

      const result = await createPlanToolHandler({
        author: 'visormatt',
        category: 'maintenance',
        title: 'Improve test coverage',
      });

      expect(result).toEqual({
        content: [{ text: 'create_plan returned no result', type: 'text' }],
        isError: true,
      });
    });
  });

  describe('when GraphQL throws', () => {
    it('returns an error result with the message', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
      vi.mocked(executeGraphqlWithAuth).mockRejectedValue(
        new Error('network down'),
      );

      const result = await createPlanToolHandler({
        author: 'visormatt',
        category: 'maintenance',
        title: 'Improve test coverage',
      });

      expect(result).toEqual({
        content: [{ text: 'create_plan failed: network down', type: 'text' }],
        isError: true,
      });
    });
  });
});

describe('listPlansByStatusToolHandler', () => {
  const serviceAccountToken = '***REMOVED-OT-TOKEN***';

  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when GraphQL returns plans', () => {
    it('returns structured plans and totalCount', async () => {
      const plans = [
        {
          id: 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e',
          status: 'IN_PROGRESS',
          title: 'Improve test coverage',
        },
      ];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        listPlansByStatus: { plans, totalCount: 1 },
      });

      const result = await listPlansByStatusToolHandler({
        statuses: ['in_progress'],
      });

      expect(result).toMatchObject({
        structuredContent: { plans, totalCount: 1 },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { statuses: ['in_progress'] } },
      );
    });
  });

  describe('when GraphQL returns no plans', () => {
    it('returns empty plans with totalCount', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        listPlansByStatus: { plans: [], totalCount: 0 },
      });

      const result = await listPlansByStatusToolHandler({
        statuses: ['completed'],
      });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/No plans found/) }],
        structuredContent: { plans: [], totalCount: 0 },
      });
    });
  });

  describe('when GraphQL returns no list result', () => {
    it('returns a no-result error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        listPlansByStatus: null,
      });

      const result = await listPlansByStatusToolHandler({
        statuses: ['pending'],
      });

      expect(result).toEqual({
        content: [
          { text: 'list_plans_by_status returned no result', type: 'text' },
        ],
        isError: true,
      });
    });
  });
});
