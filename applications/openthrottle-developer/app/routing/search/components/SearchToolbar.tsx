import {
  Button,
  cn,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { SearchIcon } from 'lucide-react';
import * as React from 'react';
import { useSearchParams } from 'react-router';

import { SEARCH_BASE_PATH } from '~/routing/search/config';
import { SEARCH_TOOLBAR_COPY } from '~/routing/search/data/copy';

export interface SearchToolbarProps {
  /** Later controls (source filter, semantic/lexical mode indicator) render here, right-aligned. */
  readonly children?: React.ReactNode;
  readonly className?: string;
  /** Pre-fill value for the query input (from the current URL). */
  readonly defaultQuery: string;
  /** Power-user mode: `details=ranking` is on. */
  readonly expandRankingDetails: boolean;
}

/**
 * @description The /search controls in one row: the query form (a GET to /search, so a
 * search is a plain navigation), the power-user ranking-details switch, and a slot for
 * filters still to come.
 */
export const SearchToolbar = (
  props: SearchToolbarProps,
): React.ReactElement => {
  const { children, className, defaultQuery, expandRankingDetails } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = React.useState(defaultQuery);

  // Setup
  const hasQuery = defaultQuery.trim() !== '';

  // Handlers
  const handleRankingChange = (checked: boolean): void => {
    const next = new URLSearchParams(searchParams);

    if (checked) {
      next.set('details', 'ranking');
    } else {
      next.delete('details');
    }

    setSearchParams(next, { preventScrollReset: true, replace: true });
  };

  // Markup
  const rankingInput = expandRankingDetails ? (
    <input name="details" type="hidden" value="ranking" />
  ) : null;
  const rankingSwitch = (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={expandRankingDetails}
            data-testid="SearchToolbar-ranking"
            disabled={!hasQuery}
            id="search-ranking-details"
            onCheckedChange={handleRankingChange}
          />
          <Label
            className="text-muted-foreground text-sm font-normal"
            htmlFor="search-ranking-details"
          >
            {SEARCH_TOOLBAR_COPY.rankingLabel}
          </Label>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {SEARCH_TOOLBAR_COPY.rankingHint}
      </TooltipContent>
    </Tooltip>
  );

  // Life Cycle
  React.useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex w-full flex-wrap items-center gap-3', className)}
      data-testid="SearchToolbar"
    >
      <form
        action={SEARCH_BASE_PATH}
        className="flex min-w-64 flex-1 items-center gap-2"
        data-testid="SearchToolbar-form"
        method="get"
        role="search"
      >
        {rankingInput}
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <SearchIcon aria-hidden={true} className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={SEARCH_TOOLBAR_COPY.queryLabel}
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={SEARCH_TOOLBAR_COPY.queryPlaceholder}
            type="search"
            value={query}
          />
        </InputGroup>
        <Button type="submit">{SEARCH_TOOLBAR_COPY.submitLabel}</Button>
      </form>
      {rankingSwitch}
      {/* Slot: source filter + semantic/lexical mode indicator land here. */}
      {children}
    </div>
  );
};
