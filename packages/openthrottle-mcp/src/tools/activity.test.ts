/**
 * @description Handler tests for activity MCP tools (get_activity_by_date, get_last_activity) with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActivityByDateToolHandler,
  getLastActivityToolHandler,
} from './activity.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const planId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const serviceAccountToken = 'ot_sa_testprefix_testsecret';

describe('getActivityByDateToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when neither date nor daysBack is provided', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await getActivityByDateToolHandler({});

      expect(result).toMatchObject({
        content: [
          {
            text: expect.stringMatching(/Invalid arguments[\s\S]*exactly one/i),
          },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when both date and daysBack are provided', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await getActivityByDateToolHandler({
        date: '2026-06-25',
        daysBack: 7,
      });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns activity', () => {
    it('returns structured activity content and maps the input through', async () => {
      const activity = {
        commits: [
          {
            createdAt: '2026-06-25T12:00:00.000Z',
            message: 'feat: add tests',
            planTitle: 'Coverage',
            repo: 'openthrottle',
            sha: 'abcdef1234567',
            taskTitle: 'Handler tests',
          },
        ],
        hasNext: false,
        outputChunks: [],
        tasksUpdated: [],
        totalCount: 1,
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        activityByDate: activity,
      });

      const result = await getActivityByDateToolHandler({ date: '2026-06-25' });

      expect(result).toMatchObject({
        structuredContent: { activity },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { date: '2026-06-25' } },
      );
    });
  });

  describe('when GraphQL returns no activity', () => {
    it('returns a no-result error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        activityByDate: null,
      });

      const result = await getActivityByDateToolHandler({ daysBack: 3 });

      expect(result).toEqual({
        content: [
          { text: 'get_activity_by_date returned no result', type: 'text' },
        ],
        isError: true,
      });
    });
  });
});

describe('getLastActivityToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await getLastActivityToolHandler({});

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/Invalid arguments[\s\S]*planId/i) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns a last activity', () => {
    it('returns structured content and defaults taskId to null', async () => {
      const last = { kind: 'commit', sha: 'abcdef1' };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        lastActivity: last,
      });

      const result = await getLastActivityToolHandler({ planId });

      expect(result).toMatchObject({
        structuredContent: { result: last },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { planId, taskId: null } },
      );
    });
  });

  describe('when GraphQL returns no last activity', () => {
    it('returns a null result with an informative message', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        lastActivity: null,
      });

      const result = await getLastActivityToolHandler({
        planId,
        taskId: '27956636-1ab4-4ded-b227-8c52bf888b05',
      });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/No activity found/) }],
        structuredContent: { result: null },
      });
    });
  });
});
