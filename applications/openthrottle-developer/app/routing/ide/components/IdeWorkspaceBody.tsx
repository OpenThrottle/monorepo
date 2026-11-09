import type {
  IdeRepositoryOption,
  IdeSearchResult,
  IdeWorkspaceListing,
} from '@openthrottle/react-router-ide';
import { IdeRepositorySelector } from '@openthrottle/react-router-ide';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { IdeWorkspaceTabs } from '~/routing/ide/components/IdeWorkspaceTabs';
import type { UseIdeWorkspaceResult } from '~/routing/ide/hooks/useIdeWorkspace';

export interface IdeWorkspaceBodyProps {
  listing: IdeWorkspaceListing | null;
  query: string;
  repositories: IdeRepositoryOption[];
  search: IdeSearchResult | null;
  selectedId: string | null;
  workspace: UseIdeWorkspaceResult;
}

/**
 * @description The /ide screen body: the repository selector plus the
 * files/symbols/semantic tabs (or the "select a repository" empty state).
 * Extracted from the route Component per route-primitive-shape R4; all state
 * and handlers come from the `useIdeWorkspace` hook via `workspace`.
 */
export const IdeWorkspaceBody = (
  props: IdeWorkspaceBodyProps,
): React.ReactElement => {
  const { listing, query, repositories, search, selectedId, workspace } = props;

  // Hooks

  // Setup
  const hasRepository = selectedId !== null && listing !== null;

  // Handlers

  // Markup
  const workspaceTabs = listing !== null && (
    <IdeWorkspaceTabs
      listing={listing}
      query={query}
      search={search}
      workspace={workspace}
    />
  );
  const noRepositoryMarkup = (
    <Empty data-testid="IdeNoRepository">
      <EmptyHeader>
        <EmptyTitle>Select a repository</EmptyTitle>
        <EmptyDescription>
          Choose a registered repository to browse, or add one in Settings →
          Repositories.
        </EmptyDescription>
      </EmptyHeader>
      <Button asChild={true} variant="outline">
        <Link prefetch="intent" to="/settings/repositories">
          Add a repository
        </Link>
      </Button>
    </Empty>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <IdeRepositorySelector
        onSelect={workspace.handleSelectRepository}
        options={repositories}
        selectedId={selectedId ?? undefined}
      />

      {hasRepository ? workspaceTabs : noRepositoryMarkup}
    </>
  );
};
