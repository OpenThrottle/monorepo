import * as React from 'react';
import classnames from 'classnames';
import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { CircleIcon } from 'lucide-react';

export interface PullRequestStatusProps {
  state: PullRequestCardFragment['state'];
}

export const PullRequestStatus = (props: PullRequestStatusProps) => {
  const { state } = props;

  // Hooks

  // Setup
  const getColor = React.useCallback(() => {
    switch (state) {
      case 'open':
        return 'bg-green-500/20 border-green-500/50 text-green-500';
      case 'closed':
        return 'bg-red-500/20 border-red-500/50 text-red-500';
      case 'merged':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-500';
      case 'draft':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-500';
      case 'reopened':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500';
      case 'syncing':
        return 'bg-purple-500/20 border-purple-500/50 text-purple-500';

      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-500';
    }
  }, [state]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('rounded-full', getColor())}>
      <span className="sr-only">{state}</span>
      <CircleIcon className="size-3" />
    </div>
  );
};
