import * as React from 'react';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import {
  DefinitionReferencesPanel,
  ExportsList,
  IdeRepositorySelector,
  IdeSearchForm,
  IdeSearchResults,
  SemanticSearchForm,
  SemanticSearchResults,
  WorkspaceFilePalette,
} from '@openthrottle/react-router-ide';
import type {
  IdeRepositoryOption,
  IdeSearchResult,
  IdeWorkspaceListing,
} from '@openthrottle/react-router-ide';
import { Link } from 'react-router';
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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <IdeRepositorySelector
        onSelect={workspace.handleSelectRepository}
        options={repositories}
        selectedId={selectedId ?? undefined}
      />

      {selectedId === null || listing === null ? (
        <Empty data-testid="IdeNoRepository">
          <EmptyHeader>
            <EmptyTitle>Select a repository</EmptyTitle>
            <EmptyDescription>
              Choose a registered repository to browse, or add one in Settings →
              Workspace.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild={true} variant="outline">
            <Link to="/settings/workspace">Open workspace settings</Link>
          </Button>
        </Empty>
      ) : (
        <Tabs defaultValue="files" onValueChange={workspace.handleTabChange}>
          <TabsList>
            <TabsTrigger value="files">Files &amp; Search</TabsTrigger>
            <TabsTrigger value="symbols">Symbols</TabsTrigger>
            <TabsTrigger value="semantic">Semantic</TabsTrigger>
          </TabsList>

          <TabsContent className="flex flex-col gap-4" value="files">
            <WorkspaceFilePalette listing={listing} />
            <IdeSearchForm
              defaultQuery={query}
              onSearch={workspace.handleSearch}
            />
            <IdeSearchResults
              result={
                search ?? {
                  matches: [],
                  query,
                  repository: listing.repository,
                  truncated: false,
                }
              }
            />
          </TabsContent>

          <TabsContent className="flex flex-col gap-4" value="symbols">
            <ExportsList
              loading={workspace.exportsLoading}
              onSelectSymbol={workspace.handleSelectSymbol}
              result={
                workspace.exportsData ?? {
                  repository: listing.repository,
                  symbols: [],
                  truncated: false,
                }
              }
              selectedSymbol={workspace.selectedSymbol}
            />
            <DefinitionReferencesPanel
              details={workspace.details ?? null}
              loading={workspace.detailsLoading}
            />
          </TabsContent>

          <TabsContent className="flex flex-col gap-4" value="semantic">
            <SemanticSearchForm
              defaultQuery={workspace.semanticQuery}
              disabled={workspace.semanticData?.status !== 'ready'}
              indexing={
                workspace.semanticData?.status === 'indexing' ||
                workspace.indexBusy
              }
              onIndex={workspace.handleIndex}
              onSearch={workspace.handleSemanticSearch}
            />
            <SemanticSearchResults
              loading={workspace.semanticLoading}
              result={
                workspace.semanticData ?? {
                  available: true,
                  indexedChunks: 0,
                  matches: [],
                  query: workspace.semanticQuery,
                  repository: listing.repository,
                  status: 'ready',
                }
              }
            />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
};
