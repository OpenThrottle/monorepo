import {
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
import { WandSparklesIcon } from 'lucide-react';
import * as React from 'react';

import { RULES_COPY } from '../data/data.copy';

export interface RulesIntroductionProps {}

export const RulesIntroduction = (
  _props: RulesIntroductionProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="RulesIntroduction">
      <div className="mb-4 flex items-center justify-between">
        <GlobalHeading
          heading="h1"
          icon={WandSparklesIcon}
          title={RULES_COPY.pageTitle}
        />
        <GlobalFeatureOnboardingTrigger />
      </div>
      <p className="text-muted-foreground text-sm">
        {RULES_COPY.pageDescription}
      </p>
    </div>
  );
};
