import type { PlanProjectOptionFragment } from '~/__generated__/graphql';

export interface GroupedProjectPickerOptions {
  readonly others: readonly PlanProjectOptionFragment[];
  readonly starred: readonly PlanProjectOptionFragment[];
}

/**
 * @description Splits the project picker's candidates into the user's starred
 * projects and the rest, each sorted by name (case-insensitive), so the picker
 * can list starred projects first.
 */
export const groupProjectPickerOptions = (
  projects: readonly PlanProjectOptionFragment[],
): GroupedProjectPickerOptions => {
  const byName = [...projects].sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return {
    others: byName.filter((project) => !project.isFavorite),
    starred: byName.filter((project) => project.isFavorite),
  };
};
