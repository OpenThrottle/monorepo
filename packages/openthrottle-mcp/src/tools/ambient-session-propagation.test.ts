/**
 * @description Guards the fix for the ledger's missing spans: mutating plan/task tools must
 * carry the connection's ambient work session, and reads must not.
 *
 * The regression this protects against is silent. Nothing fails when the header is dropped —
 * the mutation succeeds, a session is still written, and only the *shape* of the ledger is
 * wrong: a week of real use produced 435 zero-duration sessions and 1 with a span, because
 * every status change opened its own instant session instead of joining the open one.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearCurrentSession } from '../session/current-session.ts';
import { getPlanToolHandler, updatePlanToolHandler } from './plans.ts';
import { getTaskToolHandler, updateTaskToolHandler } from './tasks.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const SESSION_HEADERS = { headers: { 'X-OT-Session-Id': 'sess-1' } };

describe('ambient work-session propagation', () => {
  beforeEach(() => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'test-token';
    clearCurrentSession();
    mockExecute.mockReset();
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    clearCurrentSession();
  });

  it('update_task opens a session and sends it as X-OT-Session-Id', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-1' } })
      .mockResolvedValueOnce({ updateTask: { id: 'task-1' } });

    await updateTaskToolHandler({ id: 'task-1', status: 'COMPLETED' });

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(
      'test-token',
      expect.anything(),
      { input: expect.objectContaining({ id: 'task-1' }) },
      SESSION_HEADERS,
    );
  });

  it('update_plan sends the same session, so a run groups under one span', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-1' } })
      .mockResolvedValueOnce({ updateTask: { id: 'task-1' } })
      .mockResolvedValueOnce({ updatePlan: { id: 'plan-1' } });

    await updateTaskToolHandler({ id: 'task-1', status: 'COMPLETED' });
    await updatePlanToolHandler({ id: 'plan-1', status: 'COMPLETED' });

    // The session is opened once and reused — three calls, not four.
    expect(mockExecute).toHaveBeenCalledTimes(3);
    expect(mockExecute).toHaveBeenLastCalledWith(
      'test-token',
      expect.anything(),
      { input: expect.objectContaining({ id: 'plan-1' }) },
      SESSION_HEADERS,
    );
  });

  it('a failure to open a session does not fail the mutation', async () => {
    mockExecute
      .mockRejectedValueOnce(new Error('session service down'))
      .mockResolvedValueOnce({ updateTask: { id: 'task-1' } });

    const result = await updateTaskToolHandler({
      id: 'task-1',
      status: 'COMPLETED',
    });

    // Attribution is a nicety layered on the caller's work; it must never break it.
    expect(result).not.toHaveProperty('isError');
    expect(mockExecute).toHaveBeenLastCalledWith(
      'test-token',
      expect.anything(),
      { input: expect.objectContaining({ id: 'task-1' }) },
      {},
    );
  });

  it('reads do not open or send a session', async () => {
    mockExecute
      .mockResolvedValueOnce({ getTask: { id: 'task-1' } })
      .mockResolvedValueOnce({ getPlan: { id: 'plan-1' } });

    await getTaskToolHandler({ id: 'task-1' });
    await getPlanToolHandler({ id: 'plan-1' });

    // Two calls total: no startWorkSession slipped in. A query is not a unit of work.
    expect(mockExecute).toHaveBeenCalledTimes(2);
    for (const call of mockExecute.mock.calls) {
      expect(call[3]).toBeUndefined();
    }
  });
});
