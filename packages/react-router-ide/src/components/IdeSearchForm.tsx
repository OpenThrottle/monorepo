import * as React from 'react';
import { Button, Input, Label, cn } from '@openthrottle/react-router-shadcn';

export interface IdeSearchFormProps {
  className?: string;
  /** Pre-fill value for the query input (e.g. from the current `?q=`). */
  defaultQuery?: string;
  /** Fired with the trimmed query on submit. The app turns this into a GET `?q=`. */
  onSearch?: (query: string) => void;
}

/**
 * Presentational text-search input. Emits the query via `onSearch` on submit; the
 * developer app owns the actual GET-form/loader wiring (text search is a GET `?q=`
 * round-trip, not a fetcher). Controlled input seeded from `defaultQuery`.
 *
 * @public
 */
export const IdeSearchForm = (
  props: IdeSearchFormProps,
): React.ReactElement => {
  const { className, defaultQuery = '', onSearch } = props;

  // Hooks
  const [query, setQuery] = React.useState(defaultQuery);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Setup

  // Handlers
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSearch?.(query.trim());
  };

  // Markup

  // Life Cycle
  // Sync from `defaultQuery` only when the user isn't mid-type: a route
  // revalidation can re-derive `defaultQuery` from the URL while focused, and
  // an unconditional reset would clobber in-flight keystrokes.
  React.useEffect(() => {
    if (document.activeElement === inputRef.current) {
      return;
    }
    setQuery(defaultQuery);
  }, [defaultQuery]);

  // 🔌 Short Circuit
  return (
    <form
      className={cn('flex items-end gap-2', className)}
      data-testid="IdeSearchForm"
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="flex-1">
        <Label className="sr-only" htmlFor="ide-search-query">
          Search text
        </Label>
        <Input
          id="ide-search-query"
          name="q"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the workspace…"
          ref={inputRef}
          type="search"
          value={query}
        />
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
};
