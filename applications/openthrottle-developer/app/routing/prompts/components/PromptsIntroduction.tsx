import * as React from 'react';
import { BrainIcon } from 'lucide-react';
import {
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';

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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <GlobalHeading heading="h1" icon={BrainIcon} title="Prompts" />
        <GlobalFeatureOnboardingTrigger />
      </div>

      <p className="text-muted-foreground text-sm">
        Open a prompt for Prompt versioning and debug: IDs, content
        fingerprints, repo <code className="text-xs">filePath</code>, and a JSON
        snapshot for tickets.
      </p>
    </div>
  );
};
