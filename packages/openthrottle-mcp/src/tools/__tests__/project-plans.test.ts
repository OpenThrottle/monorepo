/**
 * @description Handler tests for the add_plan_to_project, remove_plan_from_project,
 * reorder_project_plans and get_project_plans MCP tools with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addPlanToProjectToolHandler,
  getProjectPlansToolHandler,
  removePlanFromProjectToolHandler,
  reorderProjectPlansToolHandler,
} from '../project-plans.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const projectId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const planId = '0f6b5f0e-7d3f-4f43-9c0e-0d3f1f3b6a11';
const otherPlanId = '5b3f2c1e-9a4d-4c57-8e21-6a0d7c9b2f33';
const authToken = 'test-token';

const planRow = (id: string, projectSortOrder: number | null) => {
  return {
    id,
    projectId: projectSortOrder === null ? null : projectId,
    projectSortOrder,
    status: 'PENDING',
    title: 'A plan',
  };
};

describe('project plan tools', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = authToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('addPlanToProjectToolHandler', () => {
    it('rejects missing args without calling GraphQL', async () => {
      const result = await addPlanToProjectToolHandler({ planId });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    it('passes the ids through and returns the positioned plan', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        addPlanToProject: planRow(planId, 3000),
      });

      const result = await addPlanToProjectToolHandler({ planId, projectId });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/position 3000/) }],
        structuredContent: { plan: { id: planId, projectSortOrder: 3000 } },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        authToken,
        expect.anything(),
        { input: { planId, projectId } },
      );
    });
  });

  describe('removePlanFromProjectToolHandler', () => {
    it('rejects missing args without calling GraphQL', async () => {
      const result = await removePlanFromProjectToolHandler({});

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    it('returns the plan with its position cleared', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        removePlanFromProject: planRow(planId, null),
      });

      const result = await removePlanFromProjectToolHandler({ planId });

      expect(result).toMatchObject({
        structuredContent: {
          plan: { id: planId, projectId: null, projectSortOrder: null },
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        authToken,
        expect.anything(),
        { input: { planId } },
      );
    });
  });

  describe('reorderProjectPlansToolHandler', () => {
    it('rejects missing args without calling GraphQL', async () => {
      const result = await reorderProjectPlansToolHandler({ projectId });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    it('sends the ordered ids and returns the renumbered plans', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        reorderProjectPlans: [
          planRow(otherPlanId, 1000),
          planRow(planId, 2000),
        ],
      });

      const result = await reorderProjectPlansToolHandler({
        planIds: [otherPlanId, planId],
        projectId,
      });

      expect(result).toMatchObject({
        structuredContent: {
          plans: [
            { id: otherPlanId, projectSortOrder: 1000 },
            { id: planId, projectSortOrder: 2000 },
          ],
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        authToken,
        expect.anything(),
        { input: { planIds: [otherPlanId, planId], projectId } },
      );
    });
  });

  describe('getProjectPlansToolHandler', () => {
    it('rejects missing args without calling GraphQL', async () => {
      const result = await getProjectPlansToolHandler(JSON.parse('{}'));

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    it('rejects unknown keys', async () => {
      const result = await getProjectPlansToolHandler(
        JSON.parse(`{"extra":true,"projectId":"${projectId}"}`),
      );

      expect(result).toMatchObject({ isError: true });
    });

    it('returns the plans in project order', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        projectPlans: [planRow(planId, 1000), planRow(otherPlanId, 2000)],
      });

      const result = await getProjectPlansToolHandler({ projectId });

      expect(result).toMatchObject({
        structuredContent: {
          plans: [{ id: planId }, { id: otherPlanId }],
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        authToken,
        expect.anything(),
        { projectId },
      );
    });

    it('says so when the project has no plans', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        projectPlans: [],
      });

      const result = await getProjectPlansToolHandler({ projectId });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/has no plans/) }],
        structuredContent: { plans: [] },
      });
    });
  });
});
