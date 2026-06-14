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
import { CalendarSearchIcon } from 'lucide-react';
import { CALENDAR_EMPTY_COPY } from '~/routing/calendar/data/data.copy';

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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty
      className={classnames('my-8', className)}
      data-testid="CalendarEmpty"
    >
      <EmptyMedia variant="icon">
        <CalendarSearchIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>
        {search ? CALENDAR_EMPTY_COPY.searchTitle : CALENDAR_EMPTY_COPY.title}
      </EmptyTitle>
      <EmptyDescription>
        {search
          ? CALENDAR_EMPTY_COPY.searchDescription
          : CALENDAR_EMPTY_COPY.description}
      </EmptyDescription>
      <Button asChild={true} variant="secondary">
        {search ? (
          <Link to="/calendar">{CALENDAR_EMPTY_COPY.searchCta}</Link>
        ) : (
          <Link to="/calendar/create">{CALENDAR_EMPTY_COPY.cta}</Link>
        )}
      </Button>
    </Empty>
  );
};
