import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { readSearchParam } from '@openthrottle/react-router-ui-global';
import { parsePagination } from '@openthrottle/react-router-utils';

import {
  GetPlanAssigneeOptionsDocument,
  GetPlanCountsByStatusDocument,
  GetPlansByStatusDocument,
} from '~/__generated__/graphql';
import { parseStatusesFromSearchParams } from '~/routing/plans/config/status-options';
import { parseAssigneesFromSearchParams } from '~/routing/plans/utils/parsers';

export const loadPlansIndex = async (
  request: Request,
  url: URL | undefined,
) => {
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const statuses = parseStatusesFromSearchParams(searchParams);
  const assignees = parseAssigneesFromSearchParams(searchParams);
  const { limit, offset, page } = parsePagination(searchParams);
  const q = readSearchParam(searchParams);
  const titleSubstring = q.length > 0 ? q : null;

  const [result, assigneeOptionsResult, statusCountsResult] = await Promise.all(
    [
      executeGraphqlWithAuth(request, GetPlansByStatusDocument, {
        input: {
          assignees: assignees.length > 0 ? assignees : null,
          limit,
          offset,
          statuses: statuses.length > 0 ? statuses : null,
          titleSubstring,
        },
      }),
      executeGraphqlWithAuth(request, GetPlanAssigneeOptionsDocument).catch(
        () => null,
      ),
      // Feeds only the collapsible stat cards, so a failure degrades to zeros
      // rather than failing the list.
      executeGraphqlWithAuth(request, GetPlanCountsByStatusDocument).catch(
        () => null,
      ),
    ],
  );

  const assigneeOptions: string[] =
    assigneeOptionsResult?.listDistinctAuthorsAndAssignees ?? [];

  return {
    assigneeOptions,
    assignees,
    limit,
    page,
    plans: result.listPlansByStatus.items,
    statusCounts: statusCountsResult?.planCountsByStatus ?? [],
    statuses,
    totalCount: result.listPlansByStatus.totalCount,
    totalCountAll: result.allPlansCount.totalCount,
  };
};
