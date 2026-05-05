import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { BrainCircuitIcon } from 'lucide-react';

export interface SkillsIntroductionProps {
  readonly className?: string;
}

export const SkillsIntroduction = (_props: SkillsIntroductionProps) => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h3"
        icon={BrainCircuitIcon}
        title="Skills"
      />
      <p className="text-sm text-muted-foreground">
        Static registry of <code className="text-xs">SKILL.md</code> paths in
        this monorepo—compare with disk and Cursor routing when debugging skill
        picks.
      </p>
    </div>
  );
};
