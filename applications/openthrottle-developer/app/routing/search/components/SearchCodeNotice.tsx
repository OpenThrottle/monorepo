import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@openthrottle/react-router-shadcn';
import { CodeXmlIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { SearchCodeIndexStatusFragment } from '~/__generated__/graphql';
import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';
import { getCodeSearchNotice } from '~/routing/search/utils/code-search';

export interface SearchCodeNoticeProps {
  readonly available: boolean;
  readonly index: SearchCodeIndexStatusFragment | null;
}

/**
 * @description Explains a code scope that cannot answer fully: no repository, code search gated
 * off, or an index that is missing, building or failed. Renders nothing when the index is ready.
 */
export const SearchCodeNotice = (
  props: SearchCodeNoticeProps,
): React.ReactElement | null => {
  const { available, index } = props;

  // Hooks

  // Setup
  const notice = getCodeSearchNotice(available, index);
  const canIndex = notice === 'notIndexed' || notice === 'failed';
  const repositoryId = index?.repositoryId ?? '';

  // Handlers

  // Markup
  const indexLink = (
    <Link
      className="underline underline-offset-4"
      to={`/ide?repositoryId=${encodeURIComponent(repositoryId)}`}
    >
      {SEARCH_CODE_COPY.indexLink}
    </Link>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (notice === null) {
    return null;
  }

  return (
    <Alert data-notice={notice} data-testid="SearchCodeNotice">
      <CodeXmlIcon aria-hidden={true} />
      <AlertTitle>{SEARCH_CODE_COPY.states[notice].title}</AlertTitle>
      <AlertDescription>
        <p>
          {SEARCH_CODE_COPY.states[notice].description}{' '}
          {canIndex ? indexLink : null}
        </p>
      </AlertDescription>
    </Alert>
  );
};
