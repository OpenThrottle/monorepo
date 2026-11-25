import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import { ExternalLinkIcon } from 'lucide-react';
import * as React from 'react';

import type {
  SearchCodeMatchFragment,
  SearchCodeRepositoryFragment,
} from '~/__generated__/graphql';
import {
  SEARCH_CODE_COPY,
  SEARCH_TABLE_COPY,
} from '~/routing/search/data/copy';
import { toCodeMatchHref } from '~/routing/search/utils/code-search';

export interface SearchCodeTableCellActionsProps {
  readonly match: SearchCodeMatchFragment;
  readonly repository: SearchCodeRepositoryFragment;
}

/** @description Per-match actions: open the lines on GitHub when the repository has a GitHub remote. */
export const SearchCodeTableCellActions = (
  props: SearchCodeTableCellActionsProps,
): React.ReactElement => {
  const { match, repository } = props;

  // Hooks

  // Setup
  const href = toCodeMatchHref(repository, match);
  const githubAction: GlobalPopoverAction = {
    disabled: href === null,
    href: href ?? '',
    icon: <ExternalLinkIcon aria-hidden={true} className="size-4" />,
    id: 'github',
    kind: 'external',
    label: SEARCH_CODE_COPY.table.actions.github,
  };
  const location = `${match.path}:${match.startLine}`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalPopover
      actions={[githubAction]}
      ariaLabel={`${SEARCH_TABLE_COPY.actions.menuAriaLabelPrefix} ${location}`}
      testId={`SearchCodeTableCellActions-${location}`}
    />
  );
};
