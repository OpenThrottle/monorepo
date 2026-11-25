import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalScreen,
  GlobalStatsPanel,
  readSearchParam,
  ROUTE_STATS_URL,
  shouldRevalidateIgnoringParams,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  mergeRouteModuleMeta,
  parsePagination,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/projects._index';
import { GetProjectsDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { runSetProjectFavoriteIntent } from '~/routing/projects/actions/projectFavorite';
import { ProjectsIndexHeader } from '~/routing/projects/components/ProjectsIndexHeader';
import { ProjectsStats } from '~/routing/projects/components/ProjectsStats';
import { ProjectsTable } from '~/routing/projects/components/ProjectsTable';
import { ProjectsToolbar } from '~/routing/projects/components/ProjectsToolbar';
import type { SortBy, SortOrder, View } from '~/routing/projects/config';
import { PROJECTS_DEFAULT_LIMIT } from '~/routing/projects/config/projects.defaults';
import type { ProjectWithStats } from '~/routing/projects/types';
import {
  parseProjectsBySearch,
  parseProjectWithStats,
} from '~/routing/projects/utils/parsers';
import {
  isSortBy,
  isSortOrder,
  isView,
} from '~/routing/projects/utils/projects';
import { sortProjects } from '~/routing/projects/utils/sorting';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Projects',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { projects } = await executeGraphqlWithAuth(
    args.request,
    GetProjectsDocument,
  );

  const projectsToShow: ProjectWithStats[] = projects.map(
    parseProjectWithStats,
  );

  const url = args.url;
  const { limit, offset, page } = parsePagination(url.searchParams, {
    defaultLimit: PROJECTS_DEFAULT_LIMIT,
    maxLimit: 100,
  });
  const search = readSearchParam(url.searchParams);

  const sortByParam = url.searchParams.get('sortBy') ?? '';
  const sortOrderParam = url.searchParams.get('sortOrder') ?? '';
  const viewParam = url.searchParams.get('view') ?? '';

  const sortBy: SortBy = isSortBy(sortByParam) ? sortByParam : 'name';
  const sortOrder: SortOrder = isSortOrder(sortOrderParam)
    ? sortOrderParam
    : 'asc';
  const view: View = isView(viewParam) ? viewParam : 'table';

  const filtered = parseProjectsBySearch(projectsToShow, search);
  const sorted = sortProjects(filtered, sortBy, sortOrder);
  const totalCount = sorted.length;
  const paginatedProjects = sorted.slice(offset, offset + limit);

  // Linked totals across every project, not just the current page.
  const plansLinkedCount = projectsToShow.reduce(
    (sum, project) => sum + (project.plans?.length ?? 0),
    0,
  );
  const tasksLinkedCount = projectsToShow.reduce(
    (sum, project) => sum + (project.tasks?.length ?? 0),
    0,
  );

  return {
    limit,
    page,
    plansLinkedCount,
    projects: paginatedProjects,
    search,
    sortBy,
    sortOrder,
    tasksLinkedCount,
    totalCount,
    view,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Projects | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const {
    limit,
    page,
    plansLinkedCount,
    projects,
    search,
    sortBy,
    sortOrder,
    tasksLinkedCount,
    totalCount,
    view,
  } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <ProjectsIndexHeader />

      <GlobalStatsPanel>
        <ProjectsStats
          plansLinkedCount={plansLinkedCount}
          tasksLinkedCount={tasksLinkedCount}
          totalProjects={totalCount}
        />
      </GlobalStatsPanel>

      <div className="flex flex-col gap-4">
        <ProjectsToolbar
          limit={limit}
          page={page}
          search={search}
          sortBy={sortBy}
          sortOrder={sortOrder}
          view={view}
        />
        <ProjectsTable
          // className="bg-card"
          projects={projects}
        />
        <OpenThrottlePagination
          basePath="/projects"
          className="mt-8"
          limit={limit}
          page={page}
          // Clone the live query string so `?stats=open` (and any other
          // route-local param) survives a page change; search, sort and view
          // already live in the URL, so nothing is lost by not rebuilding them.
          preserveSearchParams={true}
          resultLabel="projects"
          total={totalCount}
        />
      </div>
    </GlobalScreen>
  );
}

export const shouldRevalidate = shouldRevalidateIgnoringParams([
  ROUTE_STATS_URL.param,
]);

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  if (formData.get('intent') === 'setProjectFavorite') {
    return runSetProjectFavoriteIntent(args.request, formData);
  }
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
