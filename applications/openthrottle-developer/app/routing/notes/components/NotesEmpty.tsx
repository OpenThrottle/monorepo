import {
  Button,
  cn,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { SearchAlertIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { NOTES_EMPTY_VARIANTS } from '~/routing/notes/data/data.empty-variants';

export interface NotesEmptyProps {
  className?: string;
  search?: string;
}

export const NotesEmpty = (props: NotesEmptyProps): React.ReactElement => {
  const { className, search } = props;

  // Hooks

  // Setup
  const variant = NOTES_EMPTY_VARIANTS[search ? 'search' : 'default'];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={cn('my-8', className)}>
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>{variant.title}</EmptyTitle>
      <EmptyDescription>{variant.description}</EmptyDescription>
      <Button asChild={true} variant="secondary">
        <Link to={variant.ctaHref}>{variant.cta}</Link>
      </Button>
    </Empty>
  );
};
