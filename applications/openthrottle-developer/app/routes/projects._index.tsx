import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { FoldersIcon } from 'lucide-react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { GetProjectsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import {
  isSortBy,
  isSortOrder,
  isView,
} from '~/routing/projects/utils/projects';
import { MOCK_PROJECTS } from '~/routing/projects/data/mock.projects';
import {
  parseProjectsBySearch,
  parseProjectWithStats,
} from '~/routing/projects/utils/parsers';
import { ProjectEmpty } from '~/routing/projects/components/ProjectEmpty';
import { PROJECTS_DEFAULT_LIMIT } from '~/routing/projects/config/projects.defaults';
import { ProjectsStatsCards } from '~/routing/projects/components/ProjectsStatsCards';
import { ProjectsTable } from '~/routing/projects/components/ProjectsTable';
import { ProjectsToolbar } from '~/routing/projects/components/ProjectsToolbar';
import { SITE_TITLE } from '~/global/config/settings';
import { SortBy, SortOrder, View } from '~/routing/projects/config';
import { sortProjects } from '~/routing/projects/utils/sorting';
import type { ProjectWithStats } from '~/routing/projects/data/types';
import type { Route } from '@/app/routes/+types/projects._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Projects',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { projects } = await executeGraphqlWithAuth(
    args.request,
    GetProjectsDocument,
  );

  const isEmpty = projects.length === 0;
  const projectsToShow: ProjectWithStats[] = isEmpty
    ? MOCK_PROJECTS
    : projects.map(parseProjectWithStats);

  const url = new URL(args.request.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.max(
    1,
    Math.min(
      100,
      Number(url.searchParams.get('limit')) || PROJECTS_DEFAULT_LIMIT,
    ),
  );
  const search = (
    url.searchParams.get('q') ??
    url.searchParams.get('search') ??
    ''
  ).trim();

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
  const start = (page - 1) * limit;
  const paginatedProjects = sorted.slice(start, start + limit);

  /** Mock total plans linked across projects; when API supports it, replace with real value. */
  const plansLinkedCount = projectsToShow.reduce(
    (sum, p) => sum + (p.planCount ?? 0),
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
    totalCount,
    view,
  };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

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
    totalCount,
    view,
  } = loaderData;

  // Hooks

  // Setup
  const isEmpty = totalCount === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <ProjectsStatsCards
        plansLinkedCount={plansLinkedCount}
        totalProjects={totalCount}
      />
      {/*
      <WorkspaceEntityCrossLinks
        className="mb-4"
        label="Workspace shortcuts from projects"
      />
      */}

      <div className="flex flex-col gap-4">
        <GlobalHeading heading="h1" icon={FoldersIcon} title="Projects">
          {/*
          <Button asChild={true} className="shrink-0" variant="outline">
            <Link to="/projects/create">
              <PlusIcon className="w-4 h-4" /> Create project
            </Link>
          </Button>
          */}
        </GlobalHeading>

        <ProjectsToolbar
          limit={limit}
          page={page}
          search={search}
          sortBy={sortBy}
          sortOrder={sortOrder}
          view={view}
        />
      </div>

      {isEmpty ? (
        <ProjectEmpty search={search} />
      ) : (
        <>
          <ProjectsTable projects={projects} />
          <OpenThrottlePagination
            className="mt-8"
            limit={limit}
            page={page}
            search={search}
            sortBy={sortBy}
            sortOrder={sortOrder}
            total={totalCount}
            view={view}
          />
        </>
      )}
    </GlobalScreen>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
