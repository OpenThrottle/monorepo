import { isRecord } from '@openthrottle/nodejs-utils';

/**
 * @description One plan as the reconciler needs it: id and status only.
 */
export interface ListedPlan {
  readonly id: string;
  readonly status: string;
}

const LIST_ALL_PLANS_QUERY = `query listPlansByStatus($input: ListPlansByStatusInput!) {
  listPlansByStatus(input: $input) {
    items {
      id
      status
    }
  }
}`;

const firstNonEmpty = (
  ...values: readonly (string | undefined)[]
): string | undefined => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed !== undefined && trimmed !== '') {
      return trimmed;
    }
  }

  return undefined;
};

const resolveGraphqlUrl = (env: NodeJS.ProcessEnv): string => {
  const override = firstNonEmpty(env['OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL']);
  if (override !== undefined) {
    return override;
  }

  const base = firstNonEmpty(env['API_URL_INTERNAL']);
  if (base === undefined) {
    throw new Error('API_URL_INTERNAL is not set');
  }

  return `${base.replace(/\/$/, '')}/graphql`;
};

const toListedPlan = (item: unknown): ListedPlan | undefined => {
  if (!isRecord(item)) {
    return undefined;
  }

  const { id, status } = item;
  if (typeof id !== 'string' || typeof status !== 'string') {
    return undefined;
  }

  return { id, status };
};

const readItems = (body: unknown): readonly unknown[] => {
  if (!isRecord(body)) {
    throw new Error('GraphQL response was not a JSON object');
  }

  if (Array.isArray(body['errors']) && body['errors'].length > 0) {
    const first: unknown = body['errors'][0];
    const firstMessage = isRecord(first) ? first['message'] : undefined;
    throw new Error(
      typeof firstMessage === 'string' ? firstMessage : 'GraphQL error',
    );
  }

  const data = body['data'];
  const list = isRecord(data) ? data['listPlansByStatus'] : undefined;
  const items = isRecord(list) ? list['items'] : undefined;
  if (!Array.isArray(items)) {
    throw new Error('GraphQL response had no listPlansByStatus.items');
  }

  return items;
};

/**
 * @description Lists every plan once (`statuses: []` is the documented "no status filter") over
 * plain HTTP, so this bin needs no GraphQL client. URL: `OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL`, else
 * `API_URL_INTERNAL` + `/graphql`. Token: `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`,
 * then `OPENTHROTTLE_MCP_AUTH_TOKEN`. Throws when the API is unreachable.
 */
export const listAllPlans = async (
  limit = 2000,
  env: NodeJS.ProcessEnv = process.env,
): Promise<readonly ListedPlan[]> => {
  const token = firstNonEmpty(
    env['OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN'],
    env['OPENTHROTTLE_MCP_AUTH_TOKEN'],
  );
  const response = await fetch(resolveGraphqlUrl(env), {
    body: JSON.stringify({
      query: LIST_ALL_PLANS_QUERY,
      variables: { input: { limit, statuses: [] } },
    }),
    headers: {
      'Content-Type': 'application/json',
      ...(token !== undefined ? { Authorization: `Bearer ${token}` } : {}),
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with HTTP ${response.status}`);
  }

  const body: unknown = await response.json();

  return readItems(body).flatMap((item) => {
    const plan = toListedPlan(item);
    return plan === undefined ? [] : [plan];
  });
};
