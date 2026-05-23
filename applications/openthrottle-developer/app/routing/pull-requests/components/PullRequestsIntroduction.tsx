import * as React from 'react';
import { GitPullRequestIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';

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
      <p className="text-sm text-muted-foreground">
        Open a pull request to browse commits, checks, and conversation.
      </p>
    </div>
  );
};
