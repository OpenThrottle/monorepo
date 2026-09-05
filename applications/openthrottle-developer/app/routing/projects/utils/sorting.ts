import type { SortBy, SortOrder } from '~/routing/projects/config';
import type { ProjectWithStats } from '~/routing/projects/data/types';

export function sortProjects(
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
      case 'createdAt':
        aVal = a.createdAt ?? '';
        bVal = b.createdAt ?? '';
        return mult * (aVal?.localeCompare(bVal ?? '') || 0);

      case 'name':
        aVal = a.name ?? '';
        bVal = b.name ?? '';

        return (
          mult *
          (aVal.localeCompare(bVal, undefined, { sensitivity: 'base' }) || 0)
        );

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
