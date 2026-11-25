import { isRecord, toErrorMessage } from '@openthrottle/nodejs-utils';

import {
  OT_APPEND_OUTPUT_MUTATION,
  OT_TASKS_BY_PLAN_QUERY,
  OT_UPDATE_TASK_MUTATION,
} from '../config/ot-api.ts';
import type { Result } from '../types/social-post.ts';
import type { FetchLike } from './x-oauth.ts';

/** @description A task row as the social scripts see it. */
export interface OtTask {
  readonly completedAt: string | undefined;
  readonly id: string;
  readonly requirementsJson: string;
  readonly sortOrder: number;
  readonly status: string;
  readonly summary: string | undefined;
  readonly title: string;
  readonly updatedAt: string | undefined;
}

/** @description The fields an update may set; `undefined` leaves a field unchanged. */
export interface OtTaskUpdate {
  readonly id: string;
  readonly requirements: string | undefined;
  readonly status: string | undefined;
  readonly summary: string | undefined;
}

/**
 * @description The OpenThrottle calls the social scripts make. An interface so the scripts are
 * tested against a stub.
 * @public
 */
export interface OtClient {
  readonly appendOutput: (params: {
    readonly content: string;
    readonly planId: string;
    readonly taskId: string | undefined;
  }) => Promise<Result<undefined, string>>;
  readonly listTasks: (
    planId: string,
  ) => Promise<Result<readonly OtTask[], string>>;
  readonly updateTask: (
    update: OtTaskUpdate,
  ) => Promise<Result<OtTask, string>>;
}

const optionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const readTask = (value: unknown): OtTask | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const { id, requirementsJson, sortOrder, status, title } = value;
  const isTask =
    typeof id === 'string' &&
    typeof requirementsJson === 'string' &&
    typeof sortOrder === 'number' &&
    typeof status === 'string' &&
    typeof title === 'string';

  if (!isTask) {
    return undefined;
  }

  return {
    completedAt: optionalString(value['completedAt']),
    id,
    requirementsJson,
    sortOrder,
    status,
    summary: optionalString(value['summary']),
    title,
    updatedAt: optionalString(value['updatedAt']),
  };
};

/**
 * @description An {@link OtClient} over openthrottle-server's GraphQL API, authenticated with the
 * same bearer token the MCP uses.
 * @public
 */
export const createOtClient = (options: {
  readonly fetch: FetchLike;
  readonly token: string;
  readonly url: string;
}): OtClient => {
  const request = async (
    query: string,
    variables: Readonly<Record<string, unknown>>,
  ): Promise<Result<Readonly<Record<string, unknown>>, string>> => {
    let response: Response;

    try {
      response = await options.fetch(options.url, {
        body: JSON.stringify({ query, variables }),
        headers: {
          Authorization: `Bearer ${options.token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    } catch (error) {
      return {
        error: `OpenThrottle unreachable: ${toErrorMessage(error)}`,
        ok: false,
      };
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      return {
        error: `OpenThrottle answered ${response.status} with no JSON`,
        ok: false,
      };
    }

    const errors = isRecord(body) ? body['errors'] : undefined;
    const data = isRecord(body) ? body['data'] : undefined;

    if (Array.isArray(errors) && errors.length > 0) {
      const first: unknown = errors[0];
      const message = isRecord(first)
        ? optionalString(first['message'])
        : undefined;

      return {
        error: `OpenThrottle: ${message ?? 'GraphQL error'}`,
        ok: false,
      };
    }

    if (!response.ok || !isRecord(data)) {
      return { error: `OpenThrottle answered ${response.status}`, ok: false };
    }

    return { ok: true, value: data };
  };

  return {
    appendOutput: async ({ content, planId, taskId }) => {
      const result = await request(OT_APPEND_OUTPUT_MUTATION, {
        input: { content, kind: 'loop', planId, taskId },
      });

      return result.ok ? { ok: true, value: undefined } : result;
    },
    listTasks: async (planId) => {
      const result = await request(OT_TASKS_BY_PLAN_QUERY, {
        input: { planId },
      });

      if (!result.ok) {
        return result;
      }

      const rows = result.value['tasksByPlanId'];

      if (!Array.isArray(rows)) {
        return { error: 'OpenThrottle returned no task list', ok: false };
      }

      const tasks = rows
        .map((row) => readTask(row))
        .filter((task): task is OtTask => task !== undefined);

      return { ok: true, value: tasks };
    },
    updateTask: async (update) => {
      const input = Object.fromEntries(
        Object.entries(update).filter(([, value]) => value !== undefined),
      );
      const result = await request(OT_UPDATE_TASK_MUTATION, { input });

      if (!result.ok) {
        return result;
      }

      const task = readTask(result.value['updateTask']);

      return task === undefined
        ? { error: 'OpenThrottle returned no task', ok: false }
        : { ok: true, value: task };
    },
  };
};
