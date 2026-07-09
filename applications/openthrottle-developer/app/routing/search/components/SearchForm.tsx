import * as React from 'react';
import clsx from 'clsx';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';

export interface SearchFormProps {
  className?: string;
  /** Pre-fill value for the query input (e.g. from current URL search params). */
  defaultQuery?: string;
  /** Keep `details=ranking` on new searches when power-user mode is on. */
  preserveRankingDetails?: boolean;
}

export const SearchForm = (props: SearchFormProps): React.ReactElement => {
  const {
    className,
    defaultQuery = '',
    preserveRankingDetails = false,
  } = props;

  // Hooks
  const [query, setQuery] = React.useState(defaultQuery);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  // 🔌 Short Circuit

  return (
    <form
      action="/search"
      className={clsx('p-4', className)}
      data-testid="SearchForm"
      method="get"
      role="search"
    >
      {preserveRankingDetails ? (
        <input name="details" type="hidden" value="ranking" />
      ) : null}
      <Label className="sr-only" htmlFor="search-query">
        Search query
      </Label>
      <Input
        id="search-query"
        name="q"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search plans and tasks…"
        type="search"
        value={query}
      />
      <Button type="submit">Search</Button>
    </form>
  );
};
