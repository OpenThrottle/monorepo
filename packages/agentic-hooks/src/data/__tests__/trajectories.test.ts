/**
 * Trajectory delivery: server success, buffering of transient failures,
 * dead-lettering of permanent ones, and the budgeted buffer drain.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HookFetch } from '../../types.ts';
import { deadLetterPathFor } from '../jsonl.ts';
import type { TrajectoryInput } from '../trajectories.ts';
import {
  drainBufferedTrajectories,
  persistTrajectory,
} from '../trajectories.ts';

const URL = 'http://example.test/graphql';

const input = (taskId: string): TrajectoryInput => {
  return {
    driver: 'driver-a',
    durationMs: 10,
    exitCode: null,
    idempotencyKey: `session:s1:${taskId}`,
    model: 'model-a',
    outcome: 'completed',
    planRunId: 'run-1',
    source: 'session_upload',
    taskId,
    trajectoryJson: '{}',
  };
};

const respond = (status: number, body: unknown): HookFetch => {
  return async () => ({
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  });
};

describe('trajectory delivery', () => {
  let tmpRoot: string;
  let jsonlPath: string;
  let prevOffline: string | undefined;

  const send = (taskId: string, fetchImpl: HookFetch) => {
    return persistTrajectory(input(taskId), {
      authToken: 'tok',
      fetchImpl,
      graphqlUrl: URL,
      jsonlPath,
      repoRoot: tmpRoot,
      timeoutMs: 200,
    });
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'trajectories-'));
    jsonlPath = path.join(tmpRoot, 'trajectories.jsonl');
    prevOffline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    if (prevOffline === undefined) {
      delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    } else {
      process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = prevOffline;
    }
  });

  describe('persistTrajectory', () => {
    it('reports the server id on success', async () => {
      const ok = respond(200, {
        data: { recordAgentTrajectory: { id: 'traj-9' } },
      });
      await expect(send('t1', ok)).resolves.toEqual({
        id: 'traj-9',
        sink: 'server',
      });
      expect(fs.existsSync(jsonlPath)).toBe(false);
    });

    it('buffers a 5xx', async () => {
      const result = await send('t1', respond(503, {}));
      expect(result.sink).toBe('buffered');
      expect(fs.readFileSync(jsonlPath, 'utf8').trim()).toBe(
        JSON.stringify(input('t1')),
      );
    });

    it('buffers a network failure', async () => {
      const down: HookFetch = async () => {
        throw new Error('connect ECONNREFUSED');
      };
      await expect(send('t1', down)).resolves.toMatchObject({
        sink: 'buffered',
      });
    });

    it('buffers when offline without calling the server', async () => {
      process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = '1';
      const never: HookFetch = async () => {
        throw new Error('must not be called');
      };
      await expect(send('t1', never)).resolves.toMatchObject({
        reason: 'OPENTHROTTLE_TELEMETRY_OFFLINE=1',
        sink: 'buffered',
      });
    });

    it('dead-letters a 413', async () => {
      const result = await send('t1', respond(413, 'too large'));
      expect(result.sink).toBe('dead-letter');
      expect(fs.existsSync(jsonlPath)).toBe(false);
      expect(fs.existsSync(deadLetterPathFor(jsonlPath))).toBe(true);
    });

    it('dead-letters a GraphQL validation error', async () => {
      const rejected = respond(200, {
        errors: [
          { extensions: { code: 'BAD_USER_INPUT' }, message: 'bad planRunId' },
        ],
      });
      await expect(send('t1', rejected)).resolves.toMatchObject({
        reason: 'bad planRunId',
        sink: 'dead-letter',
      });
    });
  });

  describe('drainBufferedTrajectories', () => {
    it('sends buffered lines and empties the buffer', async () => {
      await send('t1', respond(503, {}));
      await send('t2', respond(503, {}));
      const ok = respond(200, {
        data: { recordAgentTrajectory: { id: 'traj-1' } },
      });
      const result = await drainBufferedTrajectories({
        authToken: 'tok',
        fetchImpl: ok,
        graphqlUrl: URL,
        jsonlPath,
        repoRoot: tmpRoot,
        timeoutMs: 200,
      });
      expect(result.sent).toBe(2);
      expect(fs.existsSync(jsonlPath)).toBe(false);
    });

    it('retains lines the server cannot take yet', async () => {
      await send('t1', respond(503, {}));
      const result = await drainBufferedTrajectories({
        authToken: 'tok',
        fetchImpl: respond(503, {}),
        graphqlUrl: URL,
        jsonlPath,
        repoRoot: tmpRoot,
        timeoutMs: 200,
      });
      expect(result.retained).toBe(1);
      expect(fs.readFileSync(jsonlPath, 'utf8').trim()).toBe(
        JSON.stringify(input('t1')),
      );
    });

    it('does nothing while offline', async () => {
      await send('t1', respond(503, {}));
      process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = '1';
      const result = await drainBufferedTrajectories({
        graphqlUrl: URL,
        jsonlPath,
        repoRoot: tmpRoot,
      });
      expect(result.sent + result.retained).toBe(0);
    });
  });
});
