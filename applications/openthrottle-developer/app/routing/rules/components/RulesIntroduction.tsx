import * as React from 'react';
import { WandSparklesIcon } from 'lucide-react';
import {
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
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
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={WandSparklesIcon}
        title={RULES_COPY.pageTitle}
      >
        <GlobalFeatureOnboardingTrigger />
      </GlobalHeading>
      <p className="text-muted-foreground text-sm">
        {RULES_COPY.pageDescription}
      </p>
    </div>
  );
};
