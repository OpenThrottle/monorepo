import type {
  IdeSearchResult,
  IdeWorkspaceListing,
} from '@openthrottle/react-router-ide';
import {
  DefinitionReferencesPanel,
  ExportsList,
  IdeSearchForm,
  IdeSearchResults,
  SemanticSearchForm,
  SemanticSearchResults,
  WorkspaceFilePalette,
} from '@openthrottle/react-router-ide';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { UseIdeWorkspaceResult } from '~/routing/ide/hooks/useIdeWorkspace';

export interface IdeWorkspaceTabsProps {
  listing: IdeWorkspaceListing;
  query: string;
  search: IdeSearchResult | null;
  workspace: UseIdeWorkspaceResult;
}

/**
 * @description The files/symbols/semantic tabs of the /ide workspace for a
 * selected repository listing.
 */
export const IdeWorkspaceTabs = (
  props: IdeWorkspaceTabsProps,
): React.ReactElement => {
  const { listing, query, search, workspace } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tabs defaultValue="files" onValueChange={workspace.handleTabChange}>
      <TabsList>
        <TabsTrigger value="files">Files &amp; Search</TabsTrigger>
        <TabsTrigger value="symbols">Symbols</TabsTrigger>
        <TabsTrigger value="semantic">Semantic</TabsTrigger>
      </TabsList>

      <TabsContent className="flex flex-col gap-4" value="files">
        <WorkspaceFilePalette listing={listing} />
        <IdeSearchForm defaultQuery={query} onSearch={workspace.handleSearch} />
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
            workspace.semanticData?.status === 'indexing' || workspace.indexBusy
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
  );
};
