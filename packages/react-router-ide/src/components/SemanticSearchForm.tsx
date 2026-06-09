import * as React from 'react';
import { Button, Input, Label, cn } from '@openthrottle/react-router-shadcn';

export interface SemanticSearchFormProps {
  className?: string;
  /** Pre-fill value for the query input. */
  defaultQuery?: string;
  /** Disable the form (e.g. while the semantic index is unavailable). */
  disabled?: boolean;
  /** Fired with the trimmed natural-language query on submit. */
  onSearch?: (query: string) => void;
}

/**
 * Presentational natural-language search input for the semantic tier. Emits the
 * query via `onSearch`; the app owns the wiring (server-side, once the code
 * embeddings index is available).
 *
 * @publicApi
 */
export const SemanticSearchForm = (
  props: SemanticSearchFormProps,
): React.ReactElement => {
  const { className, defaultQuery = '', disabled = false, onSearch } = props;

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
    </form>
  );
};
