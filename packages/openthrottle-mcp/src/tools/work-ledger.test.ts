import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  attachSessionSubjectToolHandler,
  endSessionToolHandler,
  recordArtifactToolHandler,
} from './work-ledger.ts';
import { clearCurrentSession } from '../session/current-session.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

describe('work-ledger tools', () => {
  beforeEach(() => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'test-token';
    clearCurrentSession();
    mockExecute.mockReset();
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    clearCurrentSession();
  });

  it('record_artifact opens a session then records, sending X-OT-Session-Id', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-1' } })
      .mockResolvedValueOnce({
        recordWorkArtifact: { externalKey: 'github:o/r@abc', id: 'art-1' },
      });

    const result = await recordArtifactToolHandler({
      payloadJson: JSON.stringify({ repo: 'o/r', sha: 'abc' }),
      type: 'git_commit',
    });

    expect(result).toMatchObject({
      structuredContent: { artifact: expect.objectContaining({ id: 'art-1' }) },
    });
    // First call opened the session; second recorded with the session header.
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(
      'test-token',
      expect.anything(),
      {
        input: expect.objectContaining({
          sessionId: 'sess-1',
          type: 'git_commit',
        }),
      },
      { headers: { 'X-OT-Session-Id': 'sess-1' } },
    );
  });

  it('record_artifact reuses the open session on a second call', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-1' } })
      .mockResolvedValue({ recordWorkArtifact: { id: 'art-x' } });

    await recordArtifactToolHandler({
      payloadJson: '{"url":"a"}',
      type: 'document',
    });
    await recordArtifactToolHandler({
      payloadJson: '{"url":"b"}',
      type: 'document',
    });

    // 1 open + 2 records; the session is not reopened.
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('record_artifact rejects invalid args without calling GraphQL', async () => {
    const result = await recordArtifactToolHandler({
      payloadJson: '',
      type: 'git_commit',
    });

    expect(result).toMatchObject({ isError: true });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('attach_session_subject opens a session and attaches the plan', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-2' } })
      .mockResolvedValueOnce({
        attachWorkSessionSubject: { id: 'subj-1', planId: 'plan-1' },
      });

    const result = await attachSessionSubjectToolHandler({
      planId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toMatchObject({
      structuredContent: { subject: expect.objectContaining({ id: 'subj-1' }) },
    });
  });

  it('end_session is a no-op when no session is active', async () => {
    const result = await endSessionToolHandler({});

    expect(result).toMatchObject({ structuredContent: { session: null } });
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
