import { Button, cn } from '@openthrottle/react-router-shadcn';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { PlusIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

export interface NotesToolbarProps {
  className?: string;
}

/**
 * @description Compact toolbar: URL-driven search (search) and Create note link. Preserves data-testid and URL-driven state.
 */
export const NotesToolbar = (props: NotesToolbarProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('w-full', className)} data-testid="NotesToolbar">
      <div className={cn('flex w-full flex-wrap items-center', 'gap-2')}>
        <GlobalToolbarSearch
          aria-label="Search notes"
          placeholder="Search notes"
          transformCommittedParams={(next) => next.delete('q')}
        />
        <div className="min-w-0 flex-1" />
        <Button asChild={true} className="shrink-0" variant="outline">
          <Link to="/notes/create" viewTransition={true}>
            <PlusIcon className="h-4 w-4" /> Create note
          </Link>
        </Button>
      </div>
    </div>
  );
};
