import {
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
import { BrainIcon } from 'lucide-react';
import * as React from 'react';

import { PROMPTS_COPY } from '~/routing/prompts/data/data.copy';

export interface PromptsIntroductionProps {}

export const PromptsIntroduction = (
  _props: PromptsIntroductionProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="PromptsIntroduction">
      <div className="mb-4 flex items-center justify-between">
        <GlobalHeading
          heading="h1"
          icon={BrainIcon}
          title={PROMPTS_COPY.pageTitle}
        />
        <GlobalFeatureOnboardingTrigger />
      </div>

      <p className="text-muted-foreground text-sm">
        {PROMPTS_COPY.pageDescription}
      </p>
    </div>
  );
};
