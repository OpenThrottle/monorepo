import * as React from 'react';
import { BrainIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';

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
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={BrainIcon}
        title="Prompts"
      />
      <p className="text-sm text-muted-foreground">
        Open a prompt for Prompt versioning and debug: IDs, content
        fingerprints, repo <code className="text-xs">filePath</code>, and a JSON
        snapshot for tickets.
      </p>
    </div>
  );
};
