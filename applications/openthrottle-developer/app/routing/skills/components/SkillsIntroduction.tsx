import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { BrainCircuitIcon } from 'lucide-react';
import { SkillsOverviewDialog } from '~/routing/skills/components/SkillsOverviewDialog';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export interface SkillsIntroductionProps {
  entries?: RepoSkillEntry[];
}

export const SkillsIntroduction = (
  props: SkillsIntroductionProps,
): React.ReactElement => {
  const { entries } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <SkillsOverviewDialog entries={entries}>
        <GlobalHeading
          className="mb-4"
          heading="h3"
          icon={BrainCircuitIcon}
          title="Skills"
        />
      </SkillsOverviewDialog>
      <p className="text-muted-foreground text-sm">
        Discovered <code className="text-xs">SKILL.md</code> paths in this
        monorepo — compare with disk and Cursor routing when debugging skill
        picks.
      </p>
    </div>
  );
};
