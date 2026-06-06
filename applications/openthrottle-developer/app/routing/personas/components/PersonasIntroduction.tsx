import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';
import type { RepoPersonaEntry } from '~/routing/agents/data/repo-personas-registry';

export interface PersonasIntroductionProps {
  entries?: RepoPersonaEntry[];
}

export const PersonasIntroduction = (
  props: PersonasIntroductionProps,
): React.ReactElement => {
  const { entries = [] } = props;

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={BookOpenIcon}
        title="Personas"
      />
      <p className="text-sm text-muted-foreground">
        Disk-backed Ralph prompt profiles from{' '}
        <code className="text-xs">.agents/personas/*.md</code> —{' '}
        {entries.length} discovered. Semantic search and in-app editing are out
        of scope for phase 1.
      </p>
    </div>
  );
};
