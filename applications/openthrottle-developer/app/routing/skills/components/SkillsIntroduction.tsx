import * as React from 'react';
import {
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
import { BrainCircuitIcon } from 'lucide-react';
import { SKILLS_COPY } from '~/routing/skills/data/data.copy';

export interface SkillsIntroductionProps {}

export const SkillsIntroduction = (
  _props: SkillsIntroductionProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="SkillsIntroduction">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={BrainCircuitIcon}
        title={SKILLS_COPY.pageTitle}
      >
        <GlobalFeatureOnboardingTrigger />
      </GlobalHeading>
      <p className="text-muted-foreground text-sm">
        {SKILLS_COPY.pageDescription}
      </p>
    </div>
  );
};
