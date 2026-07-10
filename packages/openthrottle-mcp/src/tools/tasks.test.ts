/**
 * @description Handler tests for task MCP tools (create and list/search groups) with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTaskToolHandler,
  createTasksToolHandler,
  getTasksByPlanIdToolHandler,
  reorderPlanTasksToolHandler,
  updateTaskToolHandler,
} from './tasks.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const planId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const serviceAccountToken = '***REMOVED-OT-TOKEN***';

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
      });

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

  describe('when sortOrder is provided', () => {
    it('passes sortOrder through to GraphQL', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
      const task = {
        id: '27956636-1ab4-4ded-b227-8c52bf888b05',
        planId,
        sortOrder: 1500,
        status: 'PENDING',
        title: 'Add handler tests',
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ createTask: task });

      await createTaskToolHandler({
        planId,
        sortOrder: 1500,
        title: 'Add handler tests',
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            planId,
            sortOrder: 1500,
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
    it('returns all created task ids and titles from one atomic call', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValueOnce({
        createTasks: {
          tasks: [
            {
              id: '27956636-1ab4-4ded-b227-8c52bf888b05',
              title: 'First task',
            },
            {
              id: 'c0c8c4ad-2fee-4706-8d59-84f7ed3981a8',
              title: 'Second task',
            },
          ],
          totalCount: 2,
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
      // Single round trip: no pre-fetch loop, server computes sortOrder.
      expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
    });

    it('sends one createTasks input with the tasks array (sortOrder defaulted server-side)', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValueOnce({
        createTasks: {
          tasks: [
            { id: 'new-1', title: 'First new' },
            { id: 'new-2', title: 'Second new' },
          ],
          totalCount: 2,
        },
      });

      await createTasksToolHandler({
        planId,
        tasks: [{ title: 'First new' }, { title: 'Second new' }],
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            planId,
            tasks: [
              expect.objectContaining({ sortOrder: null, title: 'First new' }),
              expect.objectContaining({ sortOrder: null, title: 'Second new' }),
            ],
          },
        },
      );
    });

    it('passes explicit per-item sortOrder and stringifies requirements', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValueOnce({
        createTasks: {
          tasks: [
            { id: 'new-1', title: 'Explicit' },
            { id: 'new-2', title: 'Implicit' },
          ],
          totalCount: 2,
        },
      });

      await createTasksToolHandler({
        planId,
        tasks: [
          { requirements: ['a', 'b'], sortOrder: 7500, title: 'Explicit' },
          { title: 'Implicit' },
        ],
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            planId,
            tasks: [
              expect.objectContaining({
                requirements: JSON.stringify(['a', 'b']),
                sortOrder: 7500,
                title: 'Explicit',
              }),
              expect.objectContaining({
                requirements: null,
                sortOrder: null,
                title: 'Implicit',
              }),
            ],
          },
        },
      );
    });
  });

  describe('when GraphQL creates no tasks', () => {
    it('returns empty created list', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValueOnce({
        createTasks: { tasks: [], totalCount: 0 },
      });

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

const taskId = '27956636-1ab4-4ded-b227-8c52bf888b05';

describe('updateTaskToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when sortOrder is provided', () => {
    it('passes sortOrder through to GraphQL', async () => {
      const task = {
        id: taskId,
        planId,
        sortOrder: 2500,
        status: 'PENDING',
        title: 'Reordered task',
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ updateTask: task });

      await updateTaskToolHandler({
        id: taskId,
        sortOrder: 2500,
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            id: taskId,
            sortOrder: 2500,
          },
        },
      );
    });
  });
});

describe('reorderPlanTasksToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await reorderPlanTasksToolHandler({
        planId,
      });

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/Invalid arguments[\s\S]*taskIds/i) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL reorders tasks', () => {
    it('returns structured tasks in new order', async () => {
      const tasks = [
        {
          id: 'c0c8c4ad-2fee-4706-8d59-84f7ed3981a8',
          planId,
          sortOrder: 1000,
          title: 'Second',
        },
        {
          id: taskId,
          planId,
          sortOrder: 2000,
          title: 'First',
        },
      ];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        reorderPlanTasks: tasks,
      });

      const result = await reorderPlanTasksToolHandler({
        planId,
        taskIds: [tasks[0].id, tasks[1].id],
      });

      expect(result).toMatchObject({
        structuredContent: { tasks },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            planId,
            taskIds: [tasks[0].id, tasks[1].id],
          },
        },
      );
    });
  });

  describe('when GraphQL returns no tasks', () => {
    it('returns an empty task list', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        reorderPlanTasks: [],
      });

      const result = await reorderPlanTasksToolHandler({
        planId,
        taskIds: [taskId],
      });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/no tasks were reordered/) }],
        structuredContent: { tasks: [] },
      });
    });
  });
});
