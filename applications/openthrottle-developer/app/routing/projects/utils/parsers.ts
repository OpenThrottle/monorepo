import { GetProjectsQuery } from '~/__generated__/graphql';
import { ProjectWithStats } from '~/routing/projects/data/types';
import {
  PROJECTS_SORT_BY,
  PROJECTS_SORT_ORDER,
  ProjectsSortBy,
  ProjectsSortOrder,
} from '~/routing/prompts/config/types';

/**
 * Maps API project to ProjectWithStats so loader always returns the same shape; when API adds planCount/lastActivityAt, use them here.
 */
export function parseProjectWithStats(
  p: GetProjectsQuery['projects'][number],
): ProjectWithStats {
  return {
    ...p,
    lastActivityAt: null,
    planCount: null,
  };
}

export function parseProjectsBySearch(
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

const isProjectsSortBy = (value: string): value is ProjectsSortBy =>
  PROJECTS_SORT_BY.some((option) => option === value);

const isProjectsSortOrder = (value: string): value is ProjectsSortOrder =>
  PROJECTS_SORT_ORDER.some((option) => option === value);

/**
 * @description Parses sortBy and sortOrder from URL search params;
 * defaults to createdAt-desc if not provided.
 */
export function parseProjectsSortFromSearchParams(
  searchParams: URLSearchParams,
): {
  sortBy: ProjectsSortBy;
  sortOrder: ProjectsSortOrder;
} {
  const by = searchParams.get('sortBy');
  const order = searchParams.get('sortOrder');

  return {
    sortBy: by != null && isProjectsSortBy(by) ? by : 'createdAt',
    sortOrder: order != null && isProjectsSortOrder(order) ? order : 'desc',
  };
}
