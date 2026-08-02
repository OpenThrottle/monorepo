import * as React from 'react';
import clsx from 'clsx';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { Link, useSearchParams } from 'react-router';
import { PlusIcon } from 'lucide-react';

export interface CalendarToolbarProps {
  className?: string;
}

/**
 * @description Compact toolbar: URL-driven search (q) and Create event link.
 * Preserves role=search, data-testid, and URL-driven state.
 */
export const CalendarToolbar = (
  props: CalendarToolbarProps,
): React.ReactElement => {
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
    <div className={clsx('w-full', className)} data-testid="CalendarToolbar">
      <form onSubmit={handleSearchSubmit} role="search">
        <div className={clsx('flex w-full flex-wrap items-center', 'gap-2')}>
          <Input
            aria-label="Search events"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-[170px] min-w-[100px] border px-2.5 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
            name="q"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search events"
            type="search"
            value={searchInput}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
          <div className="min-w-0 flex-1" />
          <Button asChild={true} className="shrink-0" variant="outline">
            <Link to="/calendar/create" viewTransition={true}>
              <PlusIcon className="h-4 w-4" /> Create event
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
};
