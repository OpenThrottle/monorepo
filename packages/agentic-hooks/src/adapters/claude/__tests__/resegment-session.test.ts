/**
 * Resegment matching: task rows update in place (same id), plan-level gaps
 * insert, dry-run writes nothing, and a second pass is a no-op.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HookFetch } from '../../../index.ts';
import { formatResegmentPlan } from '../resegment-report.ts';
import { runResegment } from '../resegment-run.ts';
import {
  applySessionResegment,
  planSessionResegment,
} from '../resegment-session.ts';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

const SESSION = 'ses-resegment-1';
const URL = 'http://example.test/graphql';
const TASK_1 = 'task-1';
const EXISTING_ID = 'traj-keep-me';

const isRecordValue = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

interface Call {
  readonly field: string;
  readonly id: string | undefined;
  readonly input: Record<string, unknown> | undefined;
}

const readFixture = (name: string): string => {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
};

const oldTrajectoryJson = JSON.stringify({
  agent: { name: 'claude', version: '2.1.0' },
  final_metrics: { total_steps: 2 },
  schema_version: 'ATIF-v1.8',
  steps: [
    { message: 'old-1', source: 'user', step_id: 1 },
    { message: 'old-2', source: 'agent', step_id: 2 },
  ],
});

interface StoredRow {
  id: string;
  idempotencyKey: string | null;
  taskId: string | null;
  trajectoryJson: string;
}

const fakeServer = (): {
  readonly calls: Call[];
  readonly fetchImpl: HookFetch;
  readonly rows: StoredRow[];
} => {
  const calls: Call[] = [];
  const rows: StoredRow[] = [
    {
      id: EXISTING_ID,
      idempotencyKey: null,
      taskId: TASK_1,
      trajectoryJson: oldTrajectoryJson,
    },
  ];

  const fetchImpl: HookFetch = async (_url, init) => {
    const parsed: unknown = JSON.parse(init.body);
    const query = isRecordValue(parsed) ? String(parsed.query ?? '') : '';
    const variables = isRecordValue(parsed) ? parsed.variables : undefined;
    const vars = isRecordValue(variables) ? variables : {};

    const listPayload = () => {
      return rows.map((row) => {
        return {
          id: row.id,
          idempotencyKey: row.idempotencyKey,
          source: 'session_upload',
          taskId: row.taskId,
          trajectoryJson: row.trajectoryJson,
        };
      });
    };

    if (query.includes('agentTrajectoriesByPlanRun')) {
      calls.push({
        field: 'agentTrajectoriesByPlanRun',
        id: undefined,
        input: undefined,
      });
      return {
        json: async () => ({
          data: { agentTrajectoriesByPlanRun: listPayload() },
        }),
        ok: true,
        status: 200,
      };
    }

    if (query.includes('agentTrajectoriesByTask')) {
      calls.push({
        field: 'agentTrajectoriesByTask',
        id: undefined,
        input: undefined,
      });
      const taskId = typeof vars.taskId === 'string' ? vars.taskId : '';
      return {
        json: async () => ({
          data: {
            agentTrajectoriesByTask: listPayload().filter((row) => {
              return row.taskId === taskId;
            }),
          },
        }),
        ok: true,
        status: 200,
      };
    }

    if (query.includes('replaceAgentTrajectory')) {
      const id = typeof vars.id === 'string' ? vars.id : '';
      const input = isRecordValue(vars.input) ? vars.input : {};
      calls.push({ field: 'replaceAgentTrajectory', id, input });
      const trajectoryJson =
        typeof input.trajectoryJson === 'string' ? input.trajectoryJson : '';
      const idempotencyKey =
        typeof input.idempotencyKey === 'string' ? input.idempotencyKey : null;
      const existing = rows.find((row) => {
        return row.id === id;
      });
      if (existing !== undefined) {
        existing.idempotencyKey = idempotencyKey;
        existing.trajectoryJson = trajectoryJson;
      }
      return {
        json: async () => ({ data: { replaceAgentTrajectory: { id } } }),
        ok: true,
        status: 200,
      };
    }

    if (query.includes('recordAgentTrajectory')) {
      const input = isRecordValue(vars.input) ? vars.input : {};
      const idempotencyKey =
        typeof input.idempotencyKey === 'string' ? input.idempotencyKey : null;
      const existing = rows.find((row) => {
        return idempotencyKey !== null && row.idempotencyKey === idempotencyKey;
      });
      if (existing !== undefined) {
        calls.push({
          field: 'recordAgentTrajectory',
          id: existing.id,
          input,
        });
        return {
          json: async () => ({
            data: { recordAgentTrajectory: { id: existing.id } },
          }),
          ok: true,
          status: 200,
        };
      }
      const id = `new-${rows.length}`;
      calls.push({ field: 'recordAgentTrajectory', id, input });
      rows.push({
        id,
        idempotencyKey,
        taskId: typeof input.taskId === 'string' ? input.taskId : null,
        trajectoryJson:
          typeof input.trajectoryJson === 'string' ? input.trajectoryJson : '',
      });
      return {
        json: async () => ({ data: { recordAgentTrajectory: { id } } }),
        ok: true,
        status: 200,
      };
    }

    return {
      json: async () => ({ errors: [{ message: `unknown op: ${query}` }] }),
      ok: true,
      status: 200,
    };
  };

  return { calls, fetchImpl, rows };
};

describe('session trajectory resegment', () => {
  let projectsDir = '';
  let transcriptPath = '';

  beforeEach(() => {
    projectsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resegment-'));
    const projectSlug = 'proj';
    fs.mkdirSync(path.join(projectsDir, projectSlug));
    transcriptPath = path.join(projectsDir, projectSlug, `${SESSION}.jsonl`);
    fs.writeFileSync(
      transcriptPath,
      readFixture('terminating-settle.synthetic.jsonl'),
    );
  });

  afterEach(() => {
    fs.rmSync(projectsDir, { force: true, recursive: true });
  });

  it('updates the matching task row in place and inserts plan-level wrap-up', async () => {
    const server = fakeServer();
    const planned = await planSessionResegment({
      authToken: 'tok',
      fetchImpl: server.fetchImpl,
      graphqlUrl: URL,
      projectsDir,
      sessionId: SESSION,
      timeoutMs: 1000,
    });
    expect(planned.kind).toBe('plan');
    if (planned.kind !== 'plan') {
      return;
    }

    const updates = planned.plan.actions.filter((action) => {
      return action.action === 'update';
    });
    const inserts = planned.plan.actions.filter((action) => {
      return action.action === 'insert';
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.id).toBe(EXISTING_ID);
    expect(updates[0]?.taskId).toBe(TASK_1);
    expect(updates[0]?.oldStepCount).toBe(2);
    expect(updates[0]?.newStepCount).toBeGreaterThan(0);
    expect(inserts.some((action) => action.taskId === null)).toBe(true);
    expect(
      updates[0]?.action === 'update' && updates[0].input.trajectoryJson,
    ).not.toBe(oldTrajectoryJson);

    const report = formatResegmentPlan({ dryRun: true, plan: planned.plan });
    expect(report).toContain('DRY RUN');
    expect(report).toContain('UPDATE');
    expect(report).toContain('INSERT');
    expect(report).toMatch(/steps \d+ -> \d+/);

    const result = await applySessionResegment({
      authToken: 'tok',
      fetchImpl: server.fetchImpl,
      graphqlUrl: URL,
      plan: planned.plan,
      timeoutMs: 1000,
    });
    expect(result.replaced).toBe(1);
    expect(result.inserted).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);
    expect(
      server.calls.some((call) => {
        return (
          call.field === 'replaceAgentTrajectory' && call.id === EXISTING_ID
        );
      }),
    ).toBe(true);
    expect(
      server.rows.find((row) => {
        return row.id === EXISTING_ID;
      })?.id,
    ).toBe(EXISTING_ID);
  });

  it('dry-run prints old vs new step counts and writes nothing', async () => {
    const server = fakeServer();
    const out: string[] = [];
    const code = await runResegment({
      endpoint: { authToken: 'tok', graphqlUrl: URL },
      fetchImpl: server.fetchImpl,
      options: {
        dryRun: true,
        projectsDir,
        repoRoot: projectsDir,
        sessionIds: [SESSION],
        timeoutMs: 1000,
      },
      stderr: () => undefined,
      stdout: (text) => {
        out.push(text);
      },
    });
    expect(code).toBe(0);
    expect(out.join('')).toContain('DRY RUN');
    expect(out.join('')).toMatch(/steps 2 -> \d+/);
    expect(
      server.calls.some((call) => {
        return (
          call.field === 'replaceAgentTrajectory' ||
          call.field === 'recordAgentTrajectory'
        );
      }),
    ).toBe(false);
  });

  it('running twice is a no-op after the first write', async () => {
    const server = fakeServer();
    const first = await planSessionResegment({
      authToken: 'tok',
      fetchImpl: server.fetchImpl,
      graphqlUrl: URL,
      projectsDir,
      sessionId: SESSION,
      timeoutMs: 1000,
    });
    expect(first.kind).toBe('plan');
    if (first.kind !== 'plan') {
      return;
    }
    await applySessionResegment({
      authToken: 'tok',
      fetchImpl: server.fetchImpl,
      graphqlUrl: URL,
      plan: first.plan,
      timeoutMs: 1000,
    });
    const replaceCount = server.calls.filter((call) => {
      return call.field === 'replaceAgentTrajectory';
    }).length;

    const second = await planSessionResegment({
      authToken: 'tok',
      fetchImpl: server.fetchImpl,
      graphqlUrl: URL,
      projectsDir,
      sessionId: SESSION,
      timeoutMs: 1000,
    });
    expect(second.kind).toBe('plan');
    if (second.kind !== 'plan') {
      return;
    }
    expect(
      second.plan.actions.every((action) => {
        return action.action === 'skip';
      }),
    ).toBe(true);
    const applied = await applySessionResegment({
      authToken: 'tok',
      fetchImpl: server.fetchImpl,
      graphqlUrl: URL,
      plan: second.plan,
      timeoutMs: 1000,
    });
    expect(applied.skipped).toBe(second.plan.actions.length);
    expect(applied.inserted).toBe(0);
    expect(applied.replaced).toBe(0);
    expect(
      server.calls.filter((call) => {
        return call.field === 'replaceAgentTrajectory';
      }),
    ).toHaveLength(replaceCount);
  });
});
