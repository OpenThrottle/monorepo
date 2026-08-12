import * as React from 'react';
import { useSymbolDetails } from '@openthrottle/react-router-ide';
import type {
  ExportedSymbol,
  IdeExportsResult,
  IdeSemanticResult,
  IdeSymbolDetails,
} from '@openthrottle/react-router-ide';
import { useFetcher, useSearchParams } from 'react-router';

export interface UseIdeWorkspaceResult {
  details: IdeSymbolDetails | undefined;
  detailsLoading: boolean;
  exportsData: IdeExportsResult | undefined;
  exportsLoading: boolean;
  handleIndex: () => void;
  handleSearch: (nextQuery: string) => void;
  handleSelectRepository: (repositoryId: string) => void;
  handleSelectSymbol: (symbol: ExportedSymbol) => void;
  handleSemanticSearch: (nextQuery: string) => void;
  handleTabChange: (value: string) => void;
  indexBusy: boolean;
  selectedSymbol: ExportedSymbol | undefined;
  semanticData: IdeSemanticResult | undefined;
  semanticLoading: boolean;
  semanticQuery: string;
}

/**
 * @description State, fetchers, handlers, and polling effects for the /ide
 * screen (repository selection, file/symbol/semantic tabs). Extracted from the
 * route's default Component per route-primitive-shape R3/R4 so the route file
 * stays a thin adapter and the workspace body component stays UI-focused.
 */
export const useIdeWorkspace = (
  selectedId: string | null,
): UseIdeWorkspaceResult => {
  const [_searchParams, setSearchParams] = useSearchParams();
  const exportsFetcher = useFetcher<IdeExportsResult>();
  const semanticFetcher = useFetcher<IdeSemanticResult>();
  const indexFetcher = useFetcher<{ repositoryId: string; status: string }>();
  const [semanticQuery, setSemanticQuery] = React.useState('');
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

  const loadSemantic = React.useCallback(
    (nextQuery: string): void => {
      if (selectedId === null) {
        return;
      }

      const params = new URLSearchParams({ repositoryId: selectedId });
      if (nextQuery !== '') {
        params.set('q', nextQuery);
      }

      semanticFetcher.load(`/ide/semantic?${params.toString()}`);
    },
    [selectedId, semanticFetcher],
  );

  const handleTabChange = (value: string): void => {
    if (
      value === 'symbols' &&
      selectedId !== null &&
      exportsFetcher.state === 'idle' &&
      exportsFetcher.data === undefined
    ) {
      exportsFetcher.load(`/ide/symbols?repositoryId=${selectedId}`);
    }

    if (
      value === 'semantic' &&
      selectedId !== null &&
      semanticFetcher.state === 'idle' &&
      semanticFetcher.data === undefined
    ) {
      loadSemantic(semanticQuery);
    }
  };

  const handleSemanticSearch = (nextQuery: string): void => {
    setSemanticQuery(nextQuery);
    loadSemantic(nextQuery);
  };

  const handleIndex = (): void => {
    if (selectedId === null) {
      return;
    }

    indexFetcher.submit(
      { repositoryId: selectedId },
      { action: '/ide/semantic', method: 'post' },
    );
  };

  const handleSelectSymbol = (symbol: ExportedSymbol): void => {
    setSelectedSymbol(symbol);
    selectSymbol(symbol);
  };

  // After an index is enqueued, refresh status so the tab reflects "indexing".
  React.useEffect(() => {
    if (indexFetcher.state === 'idle' && indexFetcher.data !== undefined) {
      loadSemantic(semanticQuery);
    }
  }, [indexFetcher.state, indexFetcher.data, loadSemantic, semanticQuery]);

  // Poll while indexing until the index becomes ready (or otherwise settles).
  React.useEffect(() => {
    if (semanticFetcher.data?.status !== 'indexing') {
      return;
    }
    const timer = setTimeout(() => loadSemantic(semanticQuery), 2500);
    return () => clearTimeout(timer);
  }, [semanticFetcher.data, loadSemantic, semanticQuery]);

  return {
    details,
    detailsLoading,
    exportsData: exportsFetcher.data,
    exportsLoading: exportsFetcher.state !== 'idle',
    handleIndex,
    handleSearch,
    handleSelectRepository,
    handleSelectSymbol,
    handleSemanticSearch,
    handleTabChange,
    indexBusy: indexFetcher.state !== 'idle',
    selectedSymbol,
    semanticData: semanticFetcher.data,
    semanticLoading:
      semanticFetcher.state !== 'idle' || semanticFetcher.data === undefined,
    semanticQuery,
  };
};
