import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@openthrottle/react-router-shadcn';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';
import { PlusIcon } from 'lucide-react';

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
    <div className={clsx('w-full', className)} data-testid="NotesToolbar">
      <div className={clsx('flex w-full flex-wrap items-center', 'gap-2')}>
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
