/**
 * An in-memory OpenThrottle for the Ralph orchestrator: a stateful fake of the
 * handful of GraphQL operations it performs. This is the network edge — the
 * only thing a plan-run replay stands in besides the agent process — so it
 * keeps real state (an UpdateTask is visible to the next GetTasksByPlanId) and
 * records every status change and output chunk for the test to assert on.
 */

import {
  AppendPlanOutputDocument,
  GetPlanDocument,
  type GetPlanQuery,
  GetServerHealthDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  type GetTasksByPlanIdQuery,
  RecordAgentTrajectoryDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
  type WorkflowExecuteGraphqlV2,
} from '@openthrottle/openthrottle-agentic-ralph';

import type { PlanRunScenario } from '../../types/plan-run-scenario.ts';
import { placeholderUuid } from '../sanitizer/sanitizer.ts';

type PlanRow = NonNullable<GetPlanQuery['plan']>;
type TaskRow = GetTasksByPlanIdQuery['tasksByPlanId'][number];

/**
 * Fixed so the prompt the orchestrator builds is byte-identical between the
 * recording and every replay.
 */
const FIXED_TIMESTAMP = '2026-11-07T12:00:00.000Z';

/**
 * Placeholder ids start well above the ones the sanitizer hands out (1, 2, …)
 * so a scenario id can never collide with a remapped one.
 *
 * @public
 */
export const PLAN_RUN_PLAN_ID = placeholderUuid(0x1000);

/**
 * The placeholder id of a scenario's nth (0-based) task.
 *
 * @public
 */
export function planRunTaskId(index: number): string {
  return placeholderUuid(0x1001 + index);
}

/**
 * One recorded state change.
 *
 * @public
 */
export interface PlanRunStatusChange {
  readonly entity: 'plan' | 'task';
  readonly id: string;
  readonly status: string;
}

/** @public */
export interface PlanRunStore {
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  /** `AppendPlanOutput` contents, in order. */
  readonly output: () => readonly string[];
  readonly planStatus: () => string;
  /** Every plan and task status write, in order. */
  readonly statusChanges: () => readonly PlanRunStatusChange[];
  readonly taskStatus: (id: string) => string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readInput(variables: unknown): Record<string, unknown> {
  if (isRecord(variables) && isRecord(variables.input)) {
    return variables.input;
  }
  return {};
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Present a loosely typed implementation as the generic executor without an
 * assertion: the public overload advertises the target type while the
 * implementation signature stays `unknown`-based.
 */
function asExecuteGraphqlV2(
  impl: (document: unknown, variables?: unknown) => Promise<unknown>,
): WorkflowExecuteGraphqlV2;
function asExecuteGraphqlV2(impl: unknown): unknown {
  return impl;
}

/**
 * Seed a store with the scenario's plan and tasks, all `PENDING`.
 *
 * @public
 */
export function createPlanRunStore(scenario: PlanRunScenario): PlanRunStore {
  let plan: PlanRow = {
    __typename: 'PlanObject',
    assignee: null,
    author: 'replay',
    category: 'test',
    completedAt: null,
    createdAt: FIXED_TIMESTAMP,
    description: scenario.description,
    id: PLAN_RUN_PLAN_ID,
    jobRunHooksJson: '{"hooks":[]}',
    project: null,
    projectId: null,
    runConfigJson: '{}',
    status: 'PENDING',
    summary: null,
    tags: [],
    title: `Replay fixture: ${scenario.slug}`,
    updatedAt: FIXED_TIMESTAMP,
  };
  let tasks: TaskRow[] = scenario.tasks.map((task, index) => ({
    __typename: 'TaskObject',
    assignee: null,
    category: 'test',
    createdAt: FIXED_TIMESTAMP,
    description: task.description,
    id: planRunTaskId(index),
    planId: PLAN_RUN_PLAN_ID,
    project: null,
    projectId: null,
    requirementsJson: '[]',
    sortOrder: (index + 1) * 1000,
    status: 'PENDING',
    summary: null,
    title: task.title,
    updatedAt: FIXED_TIMESTAMP,
  }));
  const output: string[] = [];
  const statusChanges: PlanRunStatusChange[] = [];

  const findTask = (id: string): TaskRow | undefined => {
    return tasks.find((task) => task.id.toLowerCase() === id.toLowerCase());
  };

  const execute = async (
    document: unknown,
    variables?: unknown,
  ): Promise<unknown> => {
    const input = readInput(variables);

    if (document === GetServerHealthDocument) {
      return {
        serverHealth: {
          __typename: 'ServerHealthObject',
          api: 'ok',
          database: 'ok',
          redis: 'ok',
          websocket: 'ok',
        },
      };
    }
    if (document === GetPlanDocument) {
      return { plan };
    }
    if (document === GetTasksByPlanIdDocument) {
      return { tasksByPlanId: tasks };
    }
    if (document === GetTaskDocument) {
      return { task: findTask(readString(input, 'id')) ?? null };
    }
    if (document === UpdatePlanDocument) {
      const status = readString(input, 'status');
      plan = { ...plan, status };
      statusChanges.push({ entity: 'plan', id: plan.id, status });
      return { updatePlan: plan };
    }
    if (document === UpdateTaskDocument) {
      const id = readString(input, 'id');
      const status = readString(input, 'status');
      tasks = tasks.map((task) => {
        return task.id.toLowerCase() === id.toLowerCase()
          ? { ...task, status }
          : task;
      });
      statusChanges.push({ entity: 'task', id, status });
      return { updateTask: findTask(id) };
    }
    if (document === AppendPlanOutputDocument) {
      output.push(readString(input, 'content'));
      return { appendPlanOutput: { id: `output-${output.length}` } };
    }
    if (document === RecordAgentTrajectoryDocument) {
      return { recordAgentTrajectory: { id: 'trajectory-1' } };
    }
    throw new Error('plan-run store: unexpected GraphQL document');
  };

  return {
    executeGraphqlV2: asExecuteGraphqlV2(execute),
    output: () => output,
    planStatus: () => plan.status,
    statusChanges: () => statusChanges,
    taskStatus: (id) => findTask(id)?.status,
  };
}
