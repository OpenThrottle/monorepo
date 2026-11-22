import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { isFullUuid } from '@openthrottle/react-router-utils';
import type { UNSAFE_DataWithResponseInit } from 'react-router';
import { data } from 'react-router';

import type { Route } from '@/app/routes/+types/resources.project-plan-tasks';
import { GetProjectPlanTasksDocument } from '~/__generated__/graphql';
import type { ProjectPlanTasksData } from '~/routing/projects/types';

/**
 * @description Resource route (loader-only) backing the expandable plan rows on
 * `/projects/:projectId` — `/resources/project-plan-tasks?planId=<uuid>`. The
 * project route's loader deliberately carries no task data, so a row fetches its
 * plan's tasks here through `useFetcher().load` on first expand; that keeps the
 * route loader (and its `?page=` pagination) untouched.
 *
 * Every plan's tasks come back whole (ordered by `sortOrder`) and the row caps
 * what it renders client-side: plans rarely exceed ~50 tasks, so a server-side
 * limit/offset is not worth a schema change yet.
 *
 * Failures are returned, not thrown — a thrown fetcher error would bubble to the
 * route's error boundary and replace the whole project page. A missing or
 * malformed `planId` answers 400 with `reason: 'invalid-plan-id'`.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<UNSAFE_DataWithResponseInit<ProjectPlanTasksData>> => {
  const planId = new URL(args.request.url).searchParams.get('planId') ?? '';

  if (!isFullUuid(planId)) {
    return data<ProjectPlanTasksData>(
      { kind: 'error', planId, reason: 'invalid-plan-id' },
      { status: 400 },
    );
  }

  try {
    const { tasksByPlanId } = await executeGraphqlWithAuth(
      args.request,
      GetProjectPlanTasksDocument,
      { input: { planId } },
    );

    return data<ProjectPlanTasksData>({
      kind: 'loaded',
      planId,
      tasks: tasksByPlanId,
    });
  } catch {
    return data<ProjectPlanTasksData>(
      { kind: 'error', planId, reason: 'request-failed' },
      { status: 502 },
    );
  }
};

/**
 * @description A loaded task list is kept for the life of the page: a move or
 * remove on the project route would otherwise revalidate every expanded row's
 * fetcher and refetch tasks the action never touched.
 */
export const shouldRevalidate = (): boolean => {
  return false;
};
