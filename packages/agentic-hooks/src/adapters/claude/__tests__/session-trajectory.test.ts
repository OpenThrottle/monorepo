/**
 * The Stop-time trajectory upload: task segments cut from a synthetic session
 * transcript, against a fake GraphQL server and a temp telemetry directory.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HookFetch } from '../../../index.ts';
import {
  deadLetterPathFor,
  defaultTrajectoriesJsonlPath,
  readTrajectoryUploadState,
} from '../../../index.ts';
import { captureSessionTrajectories } from '../session-trajectory.ts';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

const SESSION = 'ses-1';
const URL = 'http://example.test/graphql';

const readFixture = (name: string): string => {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
};

const isRecordValue = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

interface Posted {
  readonly input: Record<string, unknown>;
}

interface FakeServer {
  readonly fetchImpl: HookFetch;
  readonly posted: Posted[];
}

type Behavior = 'accept' | 'down' | 'too-large';

const fakeServer = (behavior: Behavior = 'accept'): FakeServer => {
  const posted: Posted[] = [];
  const fetchImpl: HookFetch = async (_url, init) => {
    if (behavior === 'down') {
      throw new Error('connect ECONNREFUSED');
    }
    if (behavior === 'too-large') {
      return { json: async () => ({}), ok: false, status: 413 };
    }
    const parsed: unknown = JSON.parse(init.body);
    const variables = isRecordValue(parsed) ? parsed.variables : undefined;
    const sent = isRecordValue(variables) ? variables.input : undefined;
    const input = isRecordValue(sent) ? sent : {};
    posted.push({ input });
    return {
      json: async () => ({ data: { recordAgentTrajectory: { id: 'traj-1' } } }),
      ok: true,
      status: 200,
    };
  };
  return { fetchImpl, posted };
};

/** A later `begin_task_session`: closes whichever segment was open. */
const boundaryLine = (taskId: string): string => {
  return `${JSON.stringify({
    isSidechain: false,
    message: {
      content: [
        {
          id: `t-begin-${taskId}`,
          input: { planId: 'plan-1', taskId },
          name: 'mcp__openthrottle-mcp__begin_task_session',
          type: 'tool_use',
        },
      ],
      model: 'claude-opus-5-5',
      role: 'assistant',
    },
    timestamp: '2026-11-06T06:01:00.000Z',
    type: 'assistant',
  })}\n`;
};

/** A second `register_plan_run` call and its result, registering `runId`. */
const registerLines = (runId: string): string => {
  const use = {
    isSidechain: false,
    message: {
      content: [
        {
          id: `t-reg-${runId}`,
          input: { planId: 'plan-1' },
          name: 'mcp__openthrottle-mcp__register_plan_run',
          type: 'tool_use',
        },
      ],
      model: 'claude-opus-5-5',
      role: 'assistant',
    },
    timestamp: '2026-11-06T06:00:50.000Z',
    type: 'assistant',
  };
  const result = {
    isSidechain: false,
    message: {
      content: [
        {
          content: JSON.stringify({ run: { id: runId } }),
          tool_use_id: `t-reg-${runId}`,
          type: 'tool_result',
        },
      ],
      role: 'user',
    },
    timestamp: '2026-11-06T06:00:51.000Z',
    type: 'user',
  };

  return `${JSON.stringify(use)}\n${JSON.stringify(result)}\n`;
};

describe('captureSessionTrajectories', () => {
  let tmpRoot: string;
  let transcriptPath: string;
  let subagentPath: string;
  let telemetryDir: string;
  let prevDir: string | undefined;
  let prevOffline: string | undefined;
  let prevSwitch: string | undefined;

  const stop = (server: FakeServer, planRunRoot = tmpRoot) => {
    return captureSessionTrajectories({
      authToken: 'tok',
      fetchImpl: server.fetchImpl,
      graphqlUrl: URL,
      repoRoot: planRunRoot,
      sessionId: SESSION,
      timeoutMs: 200,
      transcriptPath,
    });
  };

  const writeSession = (name = 'claude-session.synthetic.jsonl'): void => {
    fs.writeFileSync(transcriptPath, readFixture(name));
  };

  const writeSubagent = (): void => {
    fs.mkdirSync(path.dirname(subagentPath), { recursive: true });
    fs.writeFileSync(subagentPath, readFixture('agent-abc123.synthetic.jsonl'));
  };

  const subagentCount = (
    input: Record<string, unknown> | undefined,
  ): number => {
    const parsed: unknown = JSON.parse(String(input?.trajectoryJson));
    return isRecordValue(parsed) && Array.isArray(parsed.subagent_trajectories)
      ? parsed.subagent_trajectories.length
      : 0;
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'session-trajectory-'));
    transcriptPath = path.join(
      tmpRoot,
      'projects',
      '-repo',
      `${SESSION}.jsonl`,
    );
    subagentPath = path.join(
      path.dirname(transcriptPath),
      SESSION,
      'subagents',
      'agent-abc123.jsonl',
    );
    telemetryDir = path.join(tmpRoot, 'telemetry');
    fs.mkdirSync(path.dirname(transcriptPath), { recursive: true });
    prevDir = process.env.OPENTHROTTLE_TELEMETRY_DIR;
    prevOffline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    prevSwitch = process.env.OPENTHROTTLE_SESSION_TRAJECTORIES;
    process.env.OPENTHROTTLE_TELEMETRY_DIR = telemetryDir;
    delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    delete process.env.OPENTHROTTLE_SESSION_TRAJECTORIES;
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    const restore = (name: string, value: string | undefined): void => {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    };
    restore('OPENTHROTTLE_TELEMETRY_DIR', prevDir);
    restore('OPENTHROTTLE_TELEMETRY_OFFLINE', prevOffline);
    restore('OPENTHROTTLE_SESSION_TRAJECTORIES', prevSwitch);
  });

  describe('a closed task segment', () => {
    it('uploads once with the session_upload source and the right ids', async () => {
      writeSession();
      const server = fakeServer();
      await stop(server);
      expect(server.posted).toHaveLength(1);
      expect(server.posted[0]?.input).toMatchObject({
        driver: 'claude',
        exitCode: null,
        idempotencyKey: `session:${SESSION}:t-begin-1`,
        model: 'claude-opus-5-5',
        outcome: 'completed',
        planRunId: 'run-1',
        source: 'session_upload',
        taskId: 'task-1',
      });
      const document: unknown = JSON.parse(
        String(server.posted[0]?.input.trajectoryJson),
      );
      expect(document).toMatchObject({
        extra: {
          openthrottle: {
            planId: 'plan-1',
            planRunId: 'run-1',
            sessionId: SESSION,
            taskId: 'task-1',
          },
        },
      });
    });

    it('uploads nothing on a second Stop with no new lines', async () => {
      writeSession();
      const server = fakeServer();
      await stop(server);
      await stop(server);
      expect(server.posted).toHaveLength(1);
    });

    it('holds the resume offset at the still-open segment', async () => {
      writeSession();
      await stop(fakeServer());
      const state = readTrajectoryUploadState({
        dir: path.join(telemetryDir, 'trajectory-uploads'),
        sessionId: SESSION,
      });
      expect(state).toMatchObject({
        planRunId: 'run-1',
        uploaded: ['t-begin-1'],
      });
      expect(state.scanOffset).toBeGreaterThan(0);
    });
  });

  describe('a segment that was still open', () => {
    it('uploads once a later boundary closes it', async () => {
      writeSession();
      const server = fakeServer();
      await stop(server);
      fs.appendFileSync(transcriptPath, boundaryLine('task-3'));
      await stop(server);
      await stop(server);
      expect(server.posted.map((entry) => entry.input.taskId)).toEqual([
        'task-1',
        'task-2',
      ]);
    });
  });

  describe('a session that registers a second run', () => {
    it('attributes each segment to the run registered before it began', async () => {
      writeSession();
      fs.appendFileSync(transcriptPath, registerLines('run-2'));
      fs.appendFileSync(transcriptPath, boundaryLine('task-3'));
      fs.appendFileSync(transcriptPath, boundaryLine('task-4'));
      const server = fakeServer();
      await stop(server);
      expect(
        server.posted.map((entry) => [
          entry.input.taskId,
          entry.input.planRunId,
        ]),
      ).toEqual([
        ['task-1', 'run-1'],
        ['task-2', 'run-1'],
        ['task-3', 'run-2'],
      ]);
    });
  });

  describe('subagent transcripts', () => {
    it('are embedded when present', async () => {
      writeSession();
      writeSubagent();
      const server = fakeServer();
      await stop(server);
      expect(subagentCount(server.posted[0]?.input)).toBe(1);
    });

    it('are skipped when the file is missing', async () => {
      writeSession();
      const server = fakeServer();
      await stop(server);
      expect(server.posted).toHaveLength(1);
      expect(subagentCount(server.posted[0]?.input)).toBe(0);
    });
  });

  describe('the kill switch', () => {
    it('uploads nothing and writes no state when set to 0', async () => {
      process.env.OPENTHROTTLE_SESSION_TRAJECTORIES = '0';
      writeSession();
      const server = fakeServer();
      await stop(server);
      expect(server.posted).toEqual([]);
      expect(fs.existsSync(path.join(telemetryDir, 'trajectory-uploads'))).toBe(
        false,
      );
    });
  });

  describe('a session with no plan run', () => {
    it('marks nothing uploaded and keeps the offset before the segment', async () => {
      const lines = readFixture('claude-session.synthetic.jsonl').split('\n');
      const withoutRegistration = lines
        .filter((line) => !line.includes('t-reg'))
        .join('\n');
      fs.writeFileSync(transcriptPath, withoutRegistration);
      const server = fakeServer();
      await stop(server);
      const state = readTrajectoryUploadState({
        dir: path.join(telemetryDir, 'trajectory-uploads'),
        sessionId: SESSION,
      });
      expect(server.posted).toEqual([]);
      expect(state.uploaded).toEqual([]);
      expect(state.scanOffset).toBe(
        Buffer.byteLength(
          `${withoutRegistration.split('\n').slice(0, 1).join('\n')}\n`,
        ),
      );
    });

    it('uploads later when the backstop file names the run', async () => {
      const lines = readFixture('claude-session.synthetic.jsonl').split('\n');
      fs.writeFileSync(
        transcriptPath,
        lines.filter((line) => !line.includes('t-reg')).join('\n'),
      );
      const planRunsDir = path.join(tmpRoot, 'repo', '.cache', 'plan-runs');
      fs.mkdirSync(planRunsDir, { recursive: true });
      fs.writeFileSync(
        path.join(planRunsDir, `${SESSION}.json`),
        JSON.stringify({ planId: 'plan-1', planRunId: 'run-9' }),
      );
      const server = fakeServer();
      await stop(server, path.join(tmpRoot, 'repo'));
      expect(server.posted[0]?.input.planRunId).toBe('run-9');
    });
  });

  describe('a session that never began an OpenThrottle task', () => {
    it('uploads nothing', async () => {
      const lines = readFixture('claude-session.synthetic.jsonl').split('\n');
      fs.writeFileSync(transcriptPath, `${lines.slice(0, 3).join('\n')}\n`);
      const server = fakeServer();
      await stop(server);
      expect(server.posted).toEqual([]);
    });
  });

  describe('delivery failures', () => {
    it('buffers a transient failure instead of throwing', async () => {
      writeSession();
      const server = fakeServer('down');
      await expect(stop(server)).resolves.toMatchObject({ handled: 1 });
      const buffered = fs
        .readFileSync(defaultTrajectoriesJsonlPath(), 'utf8')
        .trim()
        .split('\n');
      expect(buffered).toHaveLength(1);
      expect(JSON.parse(buffered[0] ?? '')).toMatchObject({
        idempotencyKey: `session:${SESSION}:t-begin-1`,
        source: 'session_upload',
        taskId: 'task-1',
      });
      await stop(fakeServer());
      expect(fs.readFileSync(defaultTrajectoriesJsonlPath(), 'utf8')).toBe(
        `${buffered[0]}\n`,
      );
    });

    it('dead-letters a permanent rejection such as 413', async () => {
      writeSession();
      await stop(fakeServer('too-large'));
      expect(fs.existsSync(defaultTrajectoriesJsonlPath())).toBe(false);
      const dead = fs
        .readFileSync(deadLetterPathFor(defaultTrajectoriesJsonlPath()), 'utf8')
        .trim();
      expect(JSON.parse(dead)).toMatchObject({
        line: {
          idempotencyKey: `session:${SESSION}:t-begin-1`,
          taskId: 'task-1',
        },
        reason: 'http 413',
      });
    });
  });
});
