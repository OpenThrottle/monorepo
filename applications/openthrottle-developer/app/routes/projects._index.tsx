import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { Button } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { FolderPlusIcon, FoldersIcon } from 'lucide-react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
  readSearchParam,
} from '@openthrottle/react-router-ui-global';
import {
  mergeRouteModuleMeta,
  parsePagination,
} from '@openthrottle/react-router-utils';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { GetProjectsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  isSortBy,
  isSortOrder,
  isView,
} from '~/routing/projects/utils/projects';
import {
  parseProjectsBySearch,
  parseProjectWithStats,
} from '~/routing/projects/utils/parsers';
import { PROJECTS_DEFAULT_LIMIT } from '~/routing/projects/config/projects.defaults';
import { ProjectsStats } from '~/routing/projects/components/ProjectsStats';
import { ProjectsTable } from '~/routing/projects/components/ProjectsTable';
import { ProjectsToolbar } from '~/routing/projects/components/ProjectsToolbar';
import { SITE_TITLE } from '~/global/config/settings';
import { SortBy, SortOrder, View } from '~/routing/projects/config';
import { sortProjects } from '~/routing/projects/utils/sorting';
import type { ProjectWithStats } from '~/routing/projects/data/types';
import type { Route } from '@/app/routes/+types/projects._index';

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

  // Linked totals across every project, not just the current page. Both come from
  // the `plans`/`tasks` collections the query already loads - the same arrays the
  // table's Plans and Tasks columns count. The previous sum read `planCount`,
  // which exists on ProjectObject but is NOT selected by this route's query, so it
  // was always undefined and the card silently showed 0 beside a table reading 7.
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
    <GlobalScreen>
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <GlobalHeading heading="h1" icon={FoldersIcon} title="Projects" />

          <Button asChild={true} className="gap-2" size="xs" variant="outline">
            <Link to="/settings/repositories">
              <FolderPlusIcon aria-hidden={true} className="size-4" />
              Add repository
            </Link>
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          Projects group plans and tasks by Nx application in this monorepo.
          Each row maps to one app (for example openthrottle-developer or
          openthrottle-server) so you can see linked plan and task counts per
          codebase. Set a project on a plan or task when work clearly targets a
          single app; leave it unset for cross-cutting, docs-only, or multi-app
          work.
        </p>
      </div>

      <ProjectsStats
        plansLinkedCount={plansLinkedCount}
        tasksLinkedCount={tasksLinkedCount}
        totalProjects={totalCount}
      />

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
          className="mt-8"
          limit={limit}
          page={page}
          resultLabel="projects"
          search={search}
          sortBy={sortBy}
          sortOrder={sortOrder}
          total={totalCount}
          view={view}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
