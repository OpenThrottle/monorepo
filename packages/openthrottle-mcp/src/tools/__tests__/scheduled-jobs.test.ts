/**
 * @description Handler tests for the scheduling MCP tools (create/list/update/delete/run-now) with
 * mocked GraphQL. The guardrails themselves are enforced server-side and tested there; these pin the
 * wire contract (the agent-only operations, the required idempotency key) and that the server's
 * rejections reach the model.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CreateScheduledJobDocument,
  DeleteScheduledJobDocument,
  ListScheduledJobsDocument,
  RunScheduledJobNowDocument,
  UpdateScheduledJobDocument,
} from '../../__generated__/graphql.js';
import {
  createScheduledJobToolDescription,
  createScheduledJobToolHandler,
  deleteScheduledJobToolHandler,
  listScheduledJobsToolHandler,
  runScheduledJobNowToolHandler,
  updateScheduledJobToolDescription,
  updateScheduledJobToolHandler,
} from '../scheduled-jobs.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const userToken = 'user-token';

const job = (overrides: Record<string, unknown> = {}) => {
  return {
    allowedCommands: [],
    approvalState: 'not_required',
    createdAt: '2026-11-03T08:00:00.000Z',
    createdVia: 'mcp',
    cronPattern: '0 9 * * *',
    driverId: 'claude',
    enabled: true,
    id: 'job-1',
    intervalMs: null,
    lastRunAt: null,
    misfirePolicy: 'skip',
    model: null,
    name: 'nightly',
    nextRunAt: null,
    prompt: 'audit',
    repositoryCheckoutId: 'checkout-1',
    runAt: null,
    scheduleKind: 'cron',
    timeoutMs: null,
    timezone: null,
    updatedAt: '2026-11-03T08:00:00.000Z',
    ...overrides,
  };
};

const createArgs = {
  cronPattern: '0 9 * * *',
  driverId: 'claude',
  idempotencyKey: 'key-1',
  name: 'nightly',
  prompt: 'audit',
  repositoryCheckoutId: 'checkout-1',
};

describe('scheduling MCP tools', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = userToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('createScheduledJobToolHandler', () => {
    describe('when the idempotency key is missing', () => {
      it('returns an invalid-args error without calling GraphQL', async () => {
        const { idempotencyKey: _omitted, ...withoutKey } = createArgs;
        const result = await createScheduledJobToolHandler(withoutKey);

        expect(result).toMatchObject({ isError: true });
        expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
      });
    });

    describe('when an unlisted field is sent', () => {
      it('rejects it (cwd and settings are not agent inputs)', async () => {
        const result = await createScheduledJobToolHandler({
          ...createArgs,
          cwd: '/etc',
        });

        expect(result).toMatchObject({ isError: true });
        expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
      });
    });

    describe('when GraphQL creates the job', () => {
      it('calls the agent mutation with the arguments and returns the job', async () => {
        const created = job();
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          createScheduledAgentJobAsAgent: created,
        });

        const result = await createScheduledJobToolHandler(createArgs);

        expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
          userToken,
          CreateScheduledJobDocument,
          { input: createArgs },
        );
        expect(result).toMatchObject({ structuredContent: { job: created } });
      });

      it('names how many commands a job may run unprompted', async () => {
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          createScheduledAgentJobAsAgent: job({
            allowedCommands: [
              'pnpm run social:x-post *',
              'git fetch origin main',
            ],
            approvalState: 'pending',
            enabled: false,
          }),
        });

        const result = await createScheduledJobToolHandler(createArgs);

        expect(result.content[0]?.text).toContain('2 allowed command(s)');
      });

      it('says so when the job is waiting for approval', async () => {
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          createScheduledAgentJobAsAgent: job({
            approvalState: 'pending',
            enabled: false,
          }),
        });

        const result = await createScheduledJobToolHandler(createArgs);

        expect(result.content[0]?.text).toContain('until a person approves');
      });
    });

    describe('when the server refuses (cap reached)', () => {
      it('surfaces the server message as a tool error', async () => {
        vi.mocked(executeGraphqlWithAuth).mockRejectedValue(
          new Error(
            'GraphQL errors: You already have 25 scheduled jobs (limit 25). Delete one before creating another.',
          ),
        );

        const result = await createScheduledJobToolHandler(createArgs);

        expect(result).toMatchObject({ isError: true });
        expect(result.content[0]?.text).toContain('limit 25');
      });
    });
  });

  describe('listScheduledJobsToolHandler', () => {
    it('lists the jobs from the agent query', async () => {
      const jobs = [job(), job({ createdVia: 'ui', id: 'job-2' })];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        scheduledAgentJobsAsAgent: jobs,
      });

      const result = await listScheduledJobsToolHandler({});

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        userToken,
        ListScheduledJobsDocument,
        {},
      );
      expect(result).toMatchObject({ structuredContent: { jobs } });
      expect(result.content[0]?.text).toContain('2 scheduled job(s)');
    });

    it('says so when there are none', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        scheduledAgentJobsAsAgent: [],
      });

      const result = await listScheduledJobsToolHandler({});

      expect(result.content[0]?.text).toBe('No scheduled jobs.');
    });
  });

  describe('updateScheduledJobToolHandler', () => {
    it('rejects a call without an id', async () => {
      const result = await updateScheduledJobToolHandler({ name: 'x' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    it('sends only the fields given', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateScheduledAgentJobAsAgent: job({ name: 'renamed' }),
      });

      await updateScheduledJobToolHandler({ id: 'job-1', name: 'renamed' });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        userToken,
        UpdateScheduledJobDocument,
        { input: { id: 'job-1', name: 'renamed' } },
      );
    });

    it('surfaces a refusal to edit a human-created job', async () => {
      vi.mocked(executeGraphqlWithAuth).mockRejectedValue(
        new Error(
          'GraphQL errors: Scheduled job job-9 was not created by an agent; the agent tools can only list or run it, not change or delete it.',
        ),
      );

      const result = await updateScheduledJobToolHandler({
        id: 'job-9',
        name: 'x',
      });

      expect(result).toMatchObject({ isError: true });
      expect(result.content[0]?.text).toContain('not created by an agent');
    });
  });

  describe('deleteScheduledJobToolHandler', () => {
    it('deletes through the agent mutation', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deleteScheduledAgentJobAsAgent: true,
      });

      const result = await deleteScheduledJobToolHandler({ id: 'job-1' });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        userToken,
        DeleteScheduledJobDocument,
        { id: 'job-1' },
      );
      expect(result).toMatchObject({
        structuredContent: { deleted: true, id: 'job-1' },
      });
    });
  });

  describe('runScheduledJobNowToolHandler', () => {
    it('queues a run through the agent mutation', async () => {
      const run = {
        createdAt: '2026-11-03T08:00:00.000Z',
        id: 'run-1',
        scheduledAgentJobId: 'job-1',
        status: 'queued',
        trigger: 'manual',
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        runScheduledAgentJobNowAsAgent: run,
      });

      const result = await runScheduledJobNowToolHandler({ id: 'job-1' });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        userToken,
        RunScheduledJobNowDocument,
        { id: 'job-1' },
      );
      expect(result).toMatchObject({ structuredContent: { run } });
    });
  });

  describe('descriptions', () => {
    it.each([
      createScheduledJobToolDescription,
      updateScheduledJobToolDescription,
    ])('state the guardrails plainly', (description) => {
      expect(description).toContain('25 jobs');
      expect(description).toContain('10');
      expect(description).toContain('approval');
      expect(description).toContain('linked acting user');
    });

    it('tells the model a create needs an idempotency key and only agent jobs are editable', () => {
      expect(createScheduledJobToolDescription).toContain('idempotencyKey is required'); // prettier-ignore
      expect(createScheduledJobToolDescription).toContain('Only jobs created through these tools'); // prettier-ignore
    });
  });
});
