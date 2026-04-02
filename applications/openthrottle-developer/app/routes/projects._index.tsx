import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GetProjectsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { MOCK_PROJECTS } from '~/routing/projects/data/mock.projects';
import { ProjectEmpty } from '~/routing/projects/components/ProjectEmpty';
import { ProjectsCardGrid } from '~/routing/projects/components/ProjectsCardGrid';
import { ProjectsStatsCards } from '~/routing/projects/components/ProjectsStatsCards';
import { ProjectsTable } from '~/routing/projects/components/ProjectsTable';
import { ProjectsToolbar } from '~/routing/projects/components/ProjectsToolbar';
import { SITE_TITLE } from '~/global/config/settings';
import type { GetProjectsQuery } from '~/__generated__/graphql';
import type { ProjectWithStats } from '~/routing/projects/data/types';
import type { Route } from '@/app/routes/+types/projects._index';

const DEFAULT_LIMIT = 10;

const SORT_BY_VALUES = ['name', 'createdAt', 'updatedAt'] as const;
const SORT_ORDER_VALUES = ['asc', 'desc'] as const;
const VIEW_VALUES = ['table', 'card'] as const;
type SortBy = (typeof SORT_BY_VALUES)[number];
type SortOrder = (typeof SORT_ORDER_VALUES)[number];
type View = (typeof VIEW_VALUES)[number];

function isSortBy(v: string): v is SortBy {
  return SORT_BY_VALUES.includes(v as SortBy);
}

function isSortOrder(v: string): v is SortOrder {
  return SORT_ORDER_VALUES.includes(v as SortOrder);
}

function isView(v: string): v is View {
  return VIEW_VALUES.includes(v as View);
}

/** Maps API project to ProjectWithStats so loader always returns the same shape; when API adds planCount/lastActivityAt, use them here. */
function toProjectWithStats(
  p: GetProjectsQuery['projects'][number],
): ProjectWithStats {
  return {
    ...p,
    lastActivityAt: null,
    planCount: null,
  };
}

function filterProjectsBySearch(
  projects: ProjectWithStats[],
  search: string,
): ProjectWithStats[] {
  const q = search.trim().toLowerCase();
  if (!q) return projects;

  return projects.filter((p) => {
    const name = (p.name ?? '').toLowerCase();
    const desc = (p.description ?? '').toLowerCase();
    const nx = (p.nxProjectName ?? '').toLowerCase();

    return name.includes(q) || desc.includes(q) || nx.includes(q);
  });
}

function sortProjects(
  projects: ProjectWithStats[],
  sortBy: SortBy,
  sortOrder: SortOrder,
): ProjectWithStats[] {
  const copy = [...projects];
  const mult = sortOrder === 'asc' ? 1 : -1;

  copy.sort((a, b) => {
    let aVal: string | undefined;
    let bVal: string | undefined;

    switch (sortBy) {
      case 'name':
        aVal = a.name ?? '';
        bVal = b.name ?? '';
        return (
          mult *
          (aVal.localeCompare(bVal, undefined, { sensitivity: 'base' }) || 0)
        );

      case 'createdAt':
        aVal = a.createdAt ?? '';
        bVal = b.createdAt ?? '';
        return mult * (aVal?.localeCompare(bVal ?? '') || 0);

      case 'updatedAt':
        aVal = a.updatedAt ?? '';
        bVal = b.updatedAt ?? '';
        return mult * (aVal?.localeCompare(bVal ?? '') || 0);

      default:
        return 0;
    }
  });

  return copy;
}

export const loader = async (args: Route.LoaderArgs) => {
  const { projects } = await executeGraphqlWithAuth(
    args.request,
    GetProjectsDocument,
  );

  const projectsToShow: ProjectWithStats[] =
    projects.length === 0 ? MOCK_PROJECTS : projects.map(toProjectWithStats);
  const url = new URL(args.request.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get('limit')) || DEFAULT_LIMIT),
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

  const filtered = filterProjectsBySearch(projectsToShow, search);
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

export default function Index(props: Route.ComponentProps) {
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
  const ProjectLayout = view === 'table' ? ProjectsTable : ProjectsCardGrid;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="gap-8 p-4 md:p-8 lg:p-12 relative flex flex-col max-w-7xl mx-auto w-full">
      {/* <OpenThrottleBreadcrumbs className="mb-2" /> */}

      <ProjectsStatsCards
        plansLinkedCount={plansLinkedCount}
        totalProjects={totalCount}
      />

      {/* <h1 className="text-xl mb-2 mt-12 text-highlight">Projects</h1> */}
      <ProjectsToolbar
        // className="my-8"
        limit={limit}
        page={page}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
        view={view}
      />

      {isEmpty ? (
        <ProjectEmpty search={search} />
      ) : (
        <>
          <ProjectLayout projects={projects} />
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
    </main>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
