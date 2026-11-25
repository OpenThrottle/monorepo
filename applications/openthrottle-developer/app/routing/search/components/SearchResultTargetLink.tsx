import * as React from 'react';
import { Link } from 'react-router';

import type { SearchResultTarget } from '~/routing/search/types/search-result-view';

export interface SearchResultTargetLinkProps {
  readonly className?: string;
  readonly label: string;
  readonly target: SearchResultTarget;
  readonly testId: string;
}

/**
 * @description A result's title or context: an in-app link, a new-tab external link, or plain
 * text when the result has nowhere to go.
 */
export const SearchResultTargetLink = (
  props: SearchResultTargetLinkProps,
): React.ReactElement => {
  const { className, label, target, testId } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (target.kind === 'internal') {
    return (
      <Link
        className={className}
        data-testid={testId}
        prefetch="intent"
        to={target.href}
      >
        {label}
      </Link>
    );
  }

  if (target.kind === 'external') {
    return (
      <a
        className={className}
        data-testid={testId}
        href={target.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {label}
      </a>
    );
  }

  return (
    <span className={className} data-testid={testId}>
      {label}
    </span>
  );
};
