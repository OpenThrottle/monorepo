import * as React from 'react';

import { AgentsSkillsRegistryCard } from '~/routing/agents/components/AgentsSkillsRegistryCard';
import type { RepoSkillEntry } from '~/routing/agents/data/data.repo-skills-registry';

export interface AgentsSkillsRegistryGridProps {
  entries: readonly RepoSkillEntry[];
}

/**
 * @description Card grid of repo skill entries. Split out of AgentsSkillsRegistry
 * to keep that component under the R6 size cap; each card lives in
 * {@link AgentsSkillsRegistryCard}.
 */
export const AgentsSkillsRegistryGrid = (
  props: AgentsSkillsRegistryGridProps,
): React.ReactElement => {
  const { entries } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {entries.map((entry) => (
        <li key={`${entry.layout}-${entry.slug}-${entry.repoRelativePath}`}>
          <AgentsSkillsRegistryCard entry={entry} />
        </li>
      ))}
    </ul>
  );
};
