import * as React from 'react';
import type { RepoPersonaEntry } from '~/routing/agents/data/repo-personas-registry';
import { getRepoPersonasRegistryCount } from '~/routing/agents/data/repo-personas-registry';

export interface PersonasStatsProps {
  entries?: RepoPersonaEntry[];
}

export const PersonasStats = (
  props: PersonasStatsProps,
): React.ReactElement => {
  const { entries = [] } = props;

  // Hooks

  // Setup
  const count = getRepoPersonasRegistryCount(entries);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="text-muted-foreground p-4 text-sm"
      data-testid="PersonasStats"
    >
      <span>
        Discovered <strong className="text-foreground">{count}</strong> persona
        {count === 1 ? '' : 's'} from disk.
      </span>
    </div>
  );
};
