import * as React from 'react';
import classnames from 'classnames';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { Link, useSearchParams } from 'react-router';
import { PlusIcon } from 'lucide-react';

export interface NotesToolbarProps {
  className?: string;
}

/**
 * @description Compact toolbar: URL-driven search (q) and Create note link. Preserves role=search, data-testid, and URL-driven state.
 */
export const NotesToolbar = (props: NotesToolbarProps) => {
  const { className } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(
    () => searchParams.get('q') ?? '',
  );

  // Setup
  const searchQuery = searchParams.get('q') ?? '';

  // Handlers
  const handleSearchSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const next = new URLSearchParams(searchParams);
      const q = searchInput.trim();

      if (q) {
        next.set('q', q);
      } else {
        next.delete('q');
      }

      setSearchParams(next, { replace: true });
    },
    [searchInput, searchParams, setSearchParams],
  );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // 🔌 Short Circuit

  return (
    <div className={classnames('w-full', className)} data-testid="NotesToolbar">
      <form onSubmit={handleSearchSubmit} role="search">
        <div
          className={classnames('flex flex-wrap items-center w-full', 'gap-2')}
        >
          <Input
            aria-label="Search notes"
            className="min-w-[100px] w-[170px] border border-input bg-background px-2.5 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            name="q"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search notes"
            type="search"
            value={searchInput}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
          <div className="flex-1 min-w-0" />
          <Button asChild={true} className="shrink-0" variant="outline">
            <Link to="/notes/create" viewTransition={true}>
              <PlusIcon className="w-4 h-4" /> Create note
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
};
