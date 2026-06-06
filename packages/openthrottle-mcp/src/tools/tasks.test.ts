/**
 * @description Handler tests for task MCP tools (create and list/search groups) with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTaskToolHandler,
  createTasksToolHandler,
  getTasksByPlanIdToolHandler,
} from './tasks.js';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const planId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const serviceAccountToken = 'ot_sa_testprefix_testsecret';

describe('createTaskToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await createTaskToolHandler({
        planId,
      } as Parameters<typeof createTaskToolHandler>[0]);

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/Invalid arguments[\s\S]*title/i) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns a task', () => {
    it('returns structured task content', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
      const task = {
        id: '27956636-1ab4-4ded-b227-8c52bf888b05',
        planId,
        status: 'PENDING',
        title: 'Add handler tests',
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ createTask: task });

      const result = await createTaskToolHandler({
        planId,
        title: 'Add handler tests',
      });

      expect(result).toMatchObject({
        structuredContent: { task },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            planId,
            title: 'Add handler tests',
          },
        },
      );
    });
  });

  describe('when GraphQL returns no task', () => {
    it('returns a no-result error', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ createTask: null });

      const result = await createTaskToolHandler({
        planId,
        title: 'Add handler tests',
      });

      expect(result).toEqual({
        content: [{ text: 'create_task returned no result', type: 'text' }],
        isError: true,
      });
    });
  });
});

describe('createTasksToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when GraphQL creates multiple tasks', () => {
    it('returns all created task ids and titles', async () => {
      vi.mocked(executeGraphqlWithAuth)
        .mockResolvedValueOnce({ tasksByPlanId: [] })
        .mockResolvedValueOnce({
          createTask: {
            id: '27956636-1ab4-4ded-b227-8c52bf888b05',
            title: 'First task',
          },
        })
        .mockResolvedValueOnce({
          createTask: {
            id: 'c0c8c4ad-2fee-4706-8d59-84f7ed3981a8',
            title: 'Second task',
          },
        });

      const result = await createTasksToolHandler({
        planId,
        tasks: [{ title: 'First task' }, { title: 'Second task' }],
      });

      expect(result).toMatchObject({
        structuredContent: {
          created: [
            {
              id: '27956636-1ab4-4ded-b227-8c52bf888b05',
              title: 'First task',
            },
            {
              id: 'c0c8c4ad-2fee-4706-8d59-84f7ed3981a8',
              title: 'Second task',
            },
          ],
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(3);
    });

    it('assigns sortOrder after plan max when omitted', async () => {
      vi.mocked(executeGraphqlWithAuth)
        .mockResolvedValueOnce({
          tasksByPlanId: [
            { id: 'existing', sortOrder: 3000, title: 'Existing' },
          ],
        })
        .mockResolvedValueOnce({
          createTask: { id: 'new-1', title: 'First new' },
        })
        .mockResolvedValueOnce({
          createTask: { id: 'new-2', title: 'Second new' },
        });

      await createTasksToolHandler({
        planId,
        tasks: [{ title: 'First new' }, { title: 'Second new' }],
      });

      expect(executeGraphqlWithAuth).toHaveBeenNthCalledWith(
        2,
        serviceAccountToken,
        expect.anything(),
        {
          input: expect.objectContaining({
            planId,
            sortOrder: 4000,
            title: 'First new',
          }),
        },
      );
      expect(executeGraphqlWithAuth).toHaveBeenNthCalledWith(
        3,
        serviceAccountToken,
        expect.anything(),
        {
          input: expect.objectContaining({
            planId,
            sortOrder: 5000,
            title: 'Second new',
          }),
        },
      );
    });

    it('respects explicit sortOrder per item', async () => {
      vi.mocked(executeGraphqlWithAuth)
        .mockResolvedValueOnce({ tasksByPlanId: [] })
        .mockResolvedValueOnce({
          createTask: { id: 'new-1', title: 'Explicit' },
        })
        .mockResolvedValueOnce({
          createTask: { id: 'new-2', title: 'Implicit' },
        });

      await createTasksToolHandler({
        planId,
        tasks: [{ sortOrder: 7500, title: 'Explicit' }, { title: 'Implicit' }],
      });

      expect(executeGraphqlWithAuth).toHaveBeenNthCalledWith(
        2,
        serviceAccountToken,
        expect.anything(),
        {
          input: expect.objectContaining({
            sortOrder: 7500,
            title: 'Explicit',
          }),
        },
      );
      expect(executeGraphqlWithAuth).toHaveBeenNthCalledWith(
        3,
        serviceAccountToken,
        expect.anything(),
        {
          input: expect.objectContaining({
            sortOrder: 1000,
            title: 'Implicit',
          }),
        },
      );
    });
  });

  describe('when GraphQL creates no tasks', () => {
    it('returns empty created list', async () => {
      vi.mocked(executeGraphqlWithAuth)
        .mockResolvedValueOnce({ tasksByPlanId: [] })
        .mockResolvedValueOnce({ createTask: null });

      const result = await createTasksToolHandler({
        planId,
        tasks: [{ title: 'Missing task' }],
      });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/no tasks were created/) }],
        structuredContent: { created: [] },
      });
    });
  });
});

describe('getTasksByPlanIdToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when GraphQL returns tasks', () => {
    it('returns structured tasks for the plan', async () => {
      const tasks = [
        {
          id: '27956636-1ab4-4ded-b227-8c52bf888b05',
          planId,
          status: 'IN_PROGRESS',
          title: 'Add handler tests',
        },
      ];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        tasksByPlanId: tasks,
      });

      const result = await getTasksByPlanIdToolHandler({ planId });

      expect(result).toMatchObject({
        structuredContent: { tasks },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { planId } },
      );
    });
  });

  describe('when GraphQL returns no tasks', () => {
    it('returns an empty task list', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        tasksByPlanId: [],
      });

      const result = await getTasksByPlanIdToolHandler({ planId });

      expect(result).toMatchObject({
        content: [{ text: 'No tasks for this plan.' }],
        structuredContent: { tasks: [] },
      });
    });
  });
});
