import * as React from 'react';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';
import { RepositorySkillInjectionToggle } from '~/routing/settings/repositories/components/RepositorySkillInjectionToggle';

export interface RepositoryInjectionCellProps {
  /** Tree depth of the row; only depth-0 repository rows own the switch. */
  depth: number;
  row: RepositoryCheckoutRow;
}

export const RepositoryInjectionCell = (
  props: RepositoryInjectionCellProps,
): React.ReactElement => {
  const { depth, row } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  // The flag is repository-level: worktree children read the parent's state and
  // get a marker instead of a second switch that would flip the same checkouts.
  if (depth > 0) {
    return (
      <span
        className="text-muted-foreground text-xs"
        title={REPOSITORIES_TABLE_COPY.injectionInheritedTitle}
      >
        {REPOSITORIES_TABLE_COPY.injectionInherited}
      </span>
    );
  }

  return (
    <RepositorySkillInjectionToggle
      enabled={row.foreignSkillInjectionEnabled}
      repositoryId={row.repositoryId}
      repositoryName={row.repositoryName}
    />
  );
};
