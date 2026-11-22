/**
 * @description Handler tests for the run_project and cancel_project_run MCP tools with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelProjectRunToolHandler,
  runProjectToolHandler,
} from '../project-runs.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const projectId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const projectRunId = '01a20241-c1db-7b58-96b3-51313a678e8e';
const authToken = 'test-token';

const runRow = (overrides: Record<string, unknown> = {}) => {
  return {
    cancelRequestedAt: null,
    createdAt: '2026-11-22T00:00:00.000Z',
    currentPlan: { id: 'plan-1', title: 'First plan' },
    id: projectRunId,
    projectId,
    settledAt: null,
    startedAt: '2026-11-22T00:00:01.000Z',
    status: 'IN_PROGRESS',
    stoppedByPlan: null,
    stoppedReason: null,
    ...overrides,
  };
};

describe('project run tools', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = authToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('runProjectToolHandler', () => {
    it('rejects missing args without calling GraphQL', async () => {
      const result = await runProjectToolHandler({});

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    it('starts the run and reports the plan it is on', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        runProject: runRow(),
      });

      const result = await runProjectToolHandler({ projectId });

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/IN_PROGRESS, on plan First plan/) },
        ],
        structuredContent: {
          projectRun: {
            currentPlan: { id: 'plan-1', title: 'First plan' },
            id: projectRunId,
            status: 'IN_PROGRESS',
          },
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        authToken,
        expect.anything(),
        { input: { projectId } },
      );
    });

    it('says how to resume a run that stopped at once', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        runProject: runRow({
          settledAt: '2026-11-22T00:00:02.000Z',
          status: 'STOPPED',
          stoppedByPlan: { id: 'plan-1', title: 'First plan' },
          stoppedReason: 'Enqueue refused: no runnable tasks',
        }),
      });

      const result = await runProjectToolHandler({ projectId });

      expect(result).toMatchObject({
        content: [
          {
            text: expect.stringMatching(
              /STOPPED at plan First plan: Enqueue refused.*run_project again/,
            ),
          },
        ],
      });
    });

    it('surfaces a refusal as an error result', async () => {
      vi.mocked(executeGraphqlWithAuth).mockRejectedValue(
        new Error('GraphQL errors: This project already has an active run.'),
      );

      const result = await runProjectToolHandler({ projectId });

      expect(result).toMatchObject({ isError: true });
    });
  });

  describe('cancelProjectRunToolHandler', () => {
    it('rejects missing args without calling GraphQL', async () => {
      const result = await cancelProjectRunToolHandler({});

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    it('cancels the run and returns it settled', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        cancelProjectRun: runRow({
          cancelRequestedAt: '2026-11-22T00:05:00.000Z',
          settledAt: '2026-11-22T00:05:01.000Z',
          status: 'CANCELLED',
        }),
      });

      const result = await cancelProjectRunToolHandler({ projectRunId });

      expect(result).toMatchObject({
        structuredContent: {
          projectRun: {
            cancelRequestedAt: '2026-11-22T00:05:00.000Z',
            status: 'CANCELLED',
          },
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        authToken,
        expect.anything(),
        { input: { projectRunId } },
      );
    });
  });
});
