import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { GitPullRequestIcon } from 'lucide-react';
import * as React from 'react';

export interface PullRequestsIntroductionProps {}

export const PullRequestsIntroduction = (
  _props: PullRequestsIntroductionProps,
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
        icon={GitPullRequestIcon}
        title="Pull requests"
      />
      <p className="text-muted-foreground text-sm">
        Open a pull request to browse commits, checks, and conversation.
      </p>
    </div>
  );
};
