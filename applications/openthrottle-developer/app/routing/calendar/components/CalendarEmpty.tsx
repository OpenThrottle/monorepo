import {
  Button,
  cn,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { CalendarSearchIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { CALENDAR_EMPTY_VARIANTS } from '~/routing/calendar/data/data.empty-variants';

export interface CalendarEmptyProps {
  className?: string;
  search?: string;
}

export const CalendarEmpty = (
  props: CalendarEmptyProps,
): React.ReactElement => {
  const { className, search } = props;

  // Hooks

  // Setup
  const variant = CALENDAR_EMPTY_VARIANTS[search ? 'search' : 'default'];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={cn('my-8', className)} data-testid="CalendarEmpty">
      <EmptyMedia variant="icon">
        <CalendarSearchIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>{variant.title}</EmptyTitle>
      <EmptyDescription>{variant.description}</EmptyDescription>
      <Button asChild={true} variant="secondary">
        <Link to={variant.ctaHref}>{variant.cta}</Link>
      </Button>
    </Empty>
  );
};
