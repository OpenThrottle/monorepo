import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
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
  useSymbolDetails,
} from '@openthrottle/react-router-ide';
import type {
  ExportedSymbol,
  IdeExportsResult,
} from '@openthrottle/react-router-ide';
import { Link, useFetcher, useSearchParams } from 'react-router';
import { GetWorkspaceSettingsDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import {
  resolveSelectedRepository,
  toRepositoryOptions,
} from '~/routing/ide/utils/repositories';
import type { Route } from '@/app/routes/+types/ide._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'IDE',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = new URL(args.request.url);
  const repositoryId = url.searchParams.get('repositoryId');
  const query = url.searchParams.get('q') ?? '';

  const data = await executeGraphqlWithAuth(
    args.request,
    GetWorkspaceSettingsDocument,
  );
  const localRepositories = data.workspaceSettings.localRepositories;
  const repositories = toRepositoryOptions(localRepositories);
  const resolved = resolveSelectedRepository(localRepositories, repositoryId);

  if (resolved === null) {
    return {
      listing: null,
      query,
      repositories,
      search: null,
      selectedId: null,
    };
  }

  const { listFilesVM, searchVM } =
    await import('~/routing/ide/data/ide-engine.server');
  const listing = await listFilesVM(resolved.config, resolved.repository);
  const search =
    query.trim() === ''
      ? null
      : await searchVM(resolved.config, resolved.repository, query);

  return {
    listing,
    query,
    repositories,
    search,
    selectedId: resolved.repository.repositoryId,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `IDE | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { listing, query, repositories, search, selectedId } = props.loaderData;

  // Hooks
  const [, setSearchParams] = useSearchParams();
  const exportsFetcher = useFetcher<IdeExportsResult>();
  const [selectedSymbol, setSelectedSymbol] = React.useState<
    ExportedSymbol | undefined
  >(undefined);
  const {
    details,
    loading: detailsLoading,
    selectSymbol,
  } = useSymbolDetails({
    endpoint:
      selectedId === null
        ? '/ide/symbol'
        : `/ide/symbol?repositoryId=${selectedId}`,
  });

  // Handlers
  const handleSelectRepository = (repositoryId: string): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('repositoryId', repositoryId);
      next.delete('q');

      return next;
    });
  };

  const handleSearch = (nextQuery: string): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextQuery === '') {
        next.delete('q');
      } else {
        next.set('q', nextQuery);
      }

      return next;
    });
  };

  const handleTabChange = (value: string): void => {
    if (
      value === 'symbols' &&
      selectedId !== null &&
      exportsFetcher.state === 'idle' &&
      exportsFetcher.data === undefined
    ) {
      exportsFetcher.load(`/ide/symbols?repositoryId=${selectedId}`);
    }
  };

  const handleSelectSymbol = (symbol: ExportedSymbol): void => {
    setSelectedSymbol(symbol);
    selectSymbol(symbol);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <GlobalScreen beta={true}>
      <IdeRepositorySelector
        onSelect={handleSelectRepository}
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
        <Tabs defaultValue="files" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="files">Files &amp; Search</TabsTrigger>
            <TabsTrigger value="symbols">Symbols</TabsTrigger>
            <TabsTrigger value="semantic">Semantic</TabsTrigger>
          </TabsList>

          <TabsContent className="flex flex-col gap-4" value="files">
            <WorkspaceFilePalette listing={listing} />
            <IdeSearchForm defaultQuery={query} onSearch={handleSearch} />
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
              loading={exportsFetcher.state !== 'idle'}
              onSelectSymbol={handleSelectSymbol}
              result={
                exportsFetcher.data ?? {
                  repository: listing.repository,
                  symbols: [],
                  truncated: false,
                }
              }
              selectedSymbol={selectedSymbol}
            />
            <DefinitionReferencesPanel
              details={details ?? null}
              loading={detailsLoading}
            />
          </TabsContent>

          <TabsContent className="flex flex-col gap-4" value="semantic">
            {/* Gated: real wiring is the server-side follow-up plan (depends on the
                code_embeddings migration). available=false renders the gated state. */}
            <SemanticSearchForm disabled={true} />
            <SemanticSearchResults
              result={{
                available: false,
                indexedChunks: 0,
                matches: [],
                query: '',
                repository: listing.repository,
                status: 'unavailable',
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
