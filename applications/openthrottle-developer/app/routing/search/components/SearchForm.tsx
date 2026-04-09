import * as React from 'react';
import classnames from 'classnames';

export interface SearchFormProps {
  readonly className?: string;
  /** Pre-fill value for the query input (e.g. from current URL search params). */
  readonly defaultQuery?: string;
}

export const SearchForm = (props: SearchFormProps) => {
  const { className, defaultQuery = '' } = props;

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
      className={classnames('p-4', className)}
      data-testid="SearchForm"
      method="get"
      role="search"
    >
      <label className="sr-only" htmlFor="search-query">
        Search query
      </label>
      <input
        id="search-query"
        name="q"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search plans and tasks…"
        type="search"
        value={query}
      />
      <button type="submit">Search</button>
    </form>
  );
};
