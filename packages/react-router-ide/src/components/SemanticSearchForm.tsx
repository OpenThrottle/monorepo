import * as React from 'react';
import { Button, Input, Label, cn } from '@openthrottle/react-router-shadcn';

export interface SemanticSearchFormProps {
  className?: string;
  /** Pre-fill value for the query input. */
  defaultQuery?: string;
  /** Disable the search input/button (e.g. while the index is unavailable or not ready). */
  disabled?: boolean;
  /** True while a (re)index job is in flight; disables the Index button and relabels it. */
  indexing?: boolean;
  /** When provided, renders an "Index" action (build/refresh the code index). */
  onIndex?: () => void;
  /** Fired with the trimmed natural-language query on submit. */
  onSearch?: (query: string) => void;
}

/**
 * Presentational natural-language search input for the semantic tier. Emits the
 * query via `onSearch`; when `onIndex` is provided, also renders an Index action so
 * the app can build/refresh the code index. The app owns the wiring (server-side).
 *
 * @publicApi
 */
export const SemanticSearchForm = (
  props: SemanticSearchFormProps,
): React.ReactElement => {
  const {
    className,
    defaultQuery = '',
    disabled = false,
    indexing = false,
    onIndex,
    onSearch,
  } = props;

  // Hooks
  const [query, setQuery] = React.useState(defaultQuery);

  // Setup

  // Handlers
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSearch?.(query.trim());
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  // 🔌 Short Circuit
  return (
    <form
      className={cn('flex items-end gap-2', className)}
      data-testid="SemanticSearchForm"
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="flex-1">
        <Label className="sr-only" htmlFor="ide-semantic-query">
          Semantic search
        </Label>
        <Input
          disabled={disabled}
          id="ide-semantic-query"
          name="sq"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Describe what you're looking for…"
          type="search"
          value={query}
        />
      </div>
      <Button disabled={disabled} type="submit">
        Search
      </Button>
      {onIndex ? (
        <Button
          disabled={indexing}
          onClick={onIndex}
          type="button"
          variant="outline"
        >
          {indexing ? 'Indexing…' : 'Index'}
        </Button>
      ) : null}
    </form>
  );
};
