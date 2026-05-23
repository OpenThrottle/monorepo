import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { SearchAlertIcon } from 'lucide-react';

export interface NotesEmptyProps {
  className?: string;
  search?: string;
}

export const NotesEmpty = (props: NotesEmptyProps): React.ReactElement => {
  const { className, search } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={classnames('my-8', className)}>
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>
        {search ? 'No notes match your search' : 'No notes yet'}
      </EmptyTitle>
      <EmptyDescription>
        {search
          ? 'Try clearing the search to see all notes.'
          : 'Create your first note to get started.'}
      </EmptyDescription>
      <Button asChild={true} variant="secondary">
        {search ? (
          <Link to="/notes">Clear search</Link>
        ) : (
          <Link to="/notes/create">Create note</Link>
        )}
      </Button>
    </Empty>
  );
};
