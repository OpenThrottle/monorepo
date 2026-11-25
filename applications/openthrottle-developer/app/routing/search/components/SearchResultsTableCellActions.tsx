import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import {
  ExternalLinkIcon,
  PanelRightIcon,
  PanelRightOpenIcon,
} from 'lucide-react';
import * as React from 'react';

import type { SearchChunk } from '~/__generated__/graphql';
import {
  SEARCH_PREVIEW_COPY,
  SEARCH_TABLE_COPY,
} from '~/routing/search/data/copy';
import { toSearchResultView } from '~/routing/search/utils/toSearchResultView';

export interface SearchResultsTableCellActionsProps {
  readonly onPreview: (
    result: SearchChunk,
    trigger: HTMLElement | null,
  ) => void;
  readonly result: SearchChunk;
}

/** @description Per-row actions: preview, then open in the app or on GitHub. */
export const SearchResultsTableCellActions = (
  props: SearchResultsTableCellActionsProps,
): React.ReactElement => {
  const { onPreview, result } = props;

  // Hooks

  // Setup
  const { source, target, title } = toSearchResultView(result);
  const openLabel = SEARCH_PREVIEW_COPY.open[source];
  const previewAction: GlobalPopoverAction = {
    icon: <PanelRightOpenIcon aria-hidden={true} className="size-4" />,
    id: 'preview',
    kind: 'select',
    label: SEARCH_TABLE_COPY.actions.preview,
    onSelect: () => {
      onPreview(result, null);
    },
  };
  const openActions: GlobalPopoverAction[] = [];

  if (target.kind === 'internal') {
    openActions.push({
      icon: <PanelRightIcon aria-hidden={true} className="size-4" />,
      id: 'open',
      kind: 'link',
      label: openLabel,
      to: target.href,
    });
  }

  if (target.kind === 'external') {
    openActions.push({
      href: target.href,
      icon: <ExternalLinkIcon aria-hidden={true} className="size-4" />,
      id: 'open',
      kind: 'external',
      label: openLabel,
    });
  }

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalPopover
      actions={[previewAction, ...openActions]}
      ariaLabel={`${SEARCH_TABLE_COPY.actions.menuAriaLabelPrefix} ${title}`}
      testId={`SearchResultsTableCellActions-${result.id}`}
    />
  );
};
