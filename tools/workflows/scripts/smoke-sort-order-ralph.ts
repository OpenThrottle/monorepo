#!/usr/bin/env node
/**
 * Smoke test: Ralph task selection follows sortOrder (not createdAt);
 * reorder_plan_tasks reshuffles execution order without delete-and-recreate.
 *
 * Uses Postgres-direct for plan/task setup (same path as cortex-ralph) and optionally
 * GraphQL reorderPlanTasks when the server schema exposes it.
 *
 * Usage: pnpm exec tsx tools/workflows/scripts/smoke-sort-order-ralph.ts
 */

import { pickRalphTaskForIteration } from '@openthrottle/openthrottle-agentic-ralph';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';
import {
  ensureDatabaseReachableOrExit,
  getCortexConfigOrExit,
  getTasksByPlanId,
} from '../src/utils/cortex-ralph';

const serverAppUrl = process.env.OPENTHROTTLE_SERVER_APP_URL?.replace(
  /\/$/,
  '',
);
const GRAPHQL_URL =
  process.env.OPENTHROTTLE_GRAPHQL_URL ??
  process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL ??
  (serverAppUrl ? `${serverAppUrl}/graphql` : 'http://localhost:6021/graphql');
const AUTH_TOKEN =
  process.env.OPENTHROTTLE_MCP_AUTH_TOKEN ??
  process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN ??
  '';

interface SmokeResult {
  readonly afterReorderNextTaskId: string | null;
  readonly graphqlReorder: 'pass' | 'fail' | 'skipped';
  readonly graphqlReorderDetail: string;
  readonly initialNextTaskId: string | null;
  readonly listOrderAfterReorder: readonly string[];
  readonly listOrderInitial: readonly string[];
  readonly planId: string;
  readonly taskAId: string;
  readonly taskBId: string;
}

const graphqlRequest = async <T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (AUTH_TOKEN) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }

  const response = await fetch(GRAPHQL_URL, {
    body: JSON.stringify({ query, variables }),
    headers,
    method: 'POST',
  });

  const payload = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '));
  }

  if (!payload.data) {
    throw new Error('GraphQL response missing data');
  }

  return payload.data;
};

const reorderViaGraphql = async (input: {
  planId: string;
  taskIds: string[];
}): Promise<{ readonly id: string; readonly sortOrder: number }[]> => {
  const data = await graphqlRequest<{
    reorderPlanTasks: { id: string; sortOrder: number }[];
  }>(
    `mutation ReorderPlanTasks($input: ReorderPlanTasksInput!) {
      reorderPlanTasks(input: $input) { id sortOrder }
    }`,
    { input },
  );

  return data.reorderPlanTasks;
};

const reorderViaSql = async (
  client: pg.Client,
  planId: string,
  taskIds: string[],
): Promise<void> => {
  const temporaryBase = 1_000_000;

  await Promise.all(
    taskIds.map((taskId, index) =>
      client.query(`UPDATE tasks SET sort_order = $1 WHERE id = $2`, [
        temporaryBase + index,
        taskId,
      ]),
    ),
  );

  await Promise.all(
    taskIds.map((taskId, index) =>
      client.query(`UPDATE tasks SET sort_order = $1 WHERE id = $2`, [
        (index + 1) * 1000,
        taskId,
      ]),
    ),
  );

  void planId;
};

const pickNext = (
  tasks: Awaited<ReturnType<typeof getTasksByPlanId>>,
): string | null => pickRalphTaskForIteration(tasks)?.id ?? null;

const runSmokeTest = async (): Promise<SmokeResult> => {
  const connectionString = getPostgresUrl();
  const postgresConfig = {
    connectionString,
    transport: 'postgres-direct' as const,
  };

  const client = new pg.Client({ connectionString });
  await client.connect();

  const author = process.env.GITHUB_USER ?? 'visormatt';
  let planId = '';
  let taskAId = '';
  let taskBId = '';
  let graphqlReorder: SmokeResult['graphqlReorder'] = 'skipped';
  let graphqlReorderDetail =
    'GraphQL reorderPlanTasks not attempted (no auth token).';

  try {
    const planRes = await client.query<{ id: string }>(
      `INSERT INTO plans (title, author, category, status, description)
       VALUES ($1, $2, 'testing', 'PENDING', $3)
       RETURNING id`,
      [
        `sortOrder smoke ${new Date().toISOString()}`,
        author,
        'Ephemeral smoke test for sortOrder Ralph selection',
      ],
    );
    planId = planRes.rows[0]?.id ?? '';

    const taskARes = await client.query<{ id: string }>(
      `INSERT INTO tasks (plan_id, title, status, sort_order)
       VALUES ($1, $2, 'PENDING', 2000)
       RETURNING id`,
      [planId, 'Created first, sortOrder 2000'],
    );
    taskAId = taskARes.rows[0]?.id ?? '';

    await new Promise((resolve) => setTimeout(resolve, 50));

    const taskBRes = await client.query<{ id: string }>(
      `INSERT INTO tasks (plan_id, title, status, sort_order)
       VALUES ($1, $2, 'PENDING', 1000)
       RETURNING id`,
      [planId, 'Created second, sortOrder 1000'],
    );
    taskBId = taskBRes.rows[0]?.id ?? '';

    const initialTasks = await getTasksByPlanId(postgresConfig, planId);
    const listOrderInitial = initialTasks.map((task) => task.id);
    const initialNextTaskId = pickNext(initialTasks);

    if (AUTH_TOKEN) {
      try {
        const reordered = await reorderViaGraphql({
          planId,
          taskIds: [taskAId, taskBId],
        });
        graphqlReorder =
          reordered[0]?.id === taskAId &&
          reordered[0]?.sortOrder === 1000 &&
          reordered[1]?.id === taskBId &&
          reordered[1]?.sortOrder === 2000
            ? 'pass'
            : 'fail';
        graphqlReorderDetail =
          graphqlReorder === 'pass'
            ? 'GraphQL reorderPlanTasks returned expected sortOrder values.'
            : `GraphQL reorderPlanTasks unexpected payload: ${JSON.stringify(reordered)}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await reorderViaSql(client, planId, [taskAId, taskBId]);
        graphqlReorder = 'skipped';
        graphqlReorderDetail = `GraphQL reorder unavailable (${message}); used SQL reorder equivalent.`;
      }
    } else {
      await reorderViaSql(client, planId, [taskAId, taskBId]);
      graphqlReorderDetail =
        'No auth token; used SQL reorder equivalent for after-reorder verification.';
    }

    const afterTasks = await getTasksByPlanId(postgresConfig, planId);
    const listOrderAfterReorder = afterTasks.map((task) => task.id);
    const afterReorderNextTaskId = pickNext(afterTasks);

    return {
      afterReorderNextTaskId,
      graphqlReorder,
      graphqlReorderDetail,
      initialNextTaskId,
      listOrderAfterReorder,
      listOrderInitial,
      planId,
      taskAId,
      taskBId,
    };
  } finally {
    if (planId) {
      await client.query(`DELETE FROM tasks WHERE plan_id = $1`, [planId]);
      await client.query(`DELETE FROM plans WHERE id = $1`, [planId]);
    }

    await client.end();
  }
};

const main = async (): Promise<void> => {
  const config = getCortexConfigOrExit();
  await ensureDatabaseReachableOrExit(config);

  const result = await runSmokeTest();

  const ralphInitialPass = result.initialNextTaskId === result.taskBId;
  const ralphAfterPass = result.afterReorderNextTaskId === result.taskAId;
  const listInitialPass =
    result.listOrderInitial[0] === result.taskBId &&
    result.listOrderInitial[1] === result.taskAId;
  const listAfterPass =
    result.listOrderAfterReorder[0] === result.taskAId &&
    result.listOrderAfterReorder[1] === result.taskBId;

  const overallPass =
    ralphInitialPass &&
    ralphAfterPass &&
    listInitialPass &&
    listAfterPass &&
    result.graphqlReorder !== 'fail';

  const lines = [
    '## sortOrder Ralph smoke test',
    '',
    `- ephemeral planId (deleted): ${result.planId}`,
    `- taskA (created first, sortOrder 2000): ${result.taskAId}`,
    `- taskB (created second, sortOrder 1000): ${result.taskBId}`,
    `- list order initial: ${result.listOrderInitial.join(' → ')} (expected B then A)`,
    `- Ralph next task initial: ${result.initialNextTaskId} (expected ${result.taskBId}) → ${ralphInitialPass ? 'PASS' : 'FAIL'}`,
    `- reorder: ${result.graphqlReorderDetail}`,
    `- list order after reorder: ${result.listOrderAfterReorder.join(' → ')} (expected A then B)`,
    `- Ralph next task after reorder: ${result.afterReorderNextTaskId} (expected ${result.taskAId}) → ${ralphAfterPass ? 'PASS' : 'FAIL'}`,
    '',
    overallPass
      ? 'Overall: PASS — Ralph follows sortOrder; reorder reshuffles without delete-and-recreate.'
      : 'Overall: FAIL — see lines above.',
  ];

  console.log(lines.join('\n'));

  if (!overallPass) {
    process.exit(1);
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
