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
import { SCHEDULE_EMPTY_COPY } from '~/routing/schedule/data/data.copy';

export interface ScheduleEmptyProps {
  className?: string;
  search?: string;
}

export const ScheduleEmpty = (
  props: ScheduleEmptyProps,
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
      data-testid="ScheduleEmpty"
    >
      <EmptyMedia variant="icon">
        <CalendarSearchIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>
        {search ? SCHEDULE_EMPTY_COPY.searchTitle : SCHEDULE_EMPTY_COPY.title}
      </EmptyTitle>
      <EmptyDescription>
        {search
          ? SCHEDULE_EMPTY_COPY.searchDescription
          : SCHEDULE_EMPTY_COPY.description}
      </EmptyDescription>
      <Button asChild={true} variant="secondary">
        {search ? (
          <Link to="/schedule">{SCHEDULE_EMPTY_COPY.searchCta}</Link>
        ) : (
          <Link to="/schedule/create">{SCHEDULE_EMPTY_COPY.cta}</Link>
        )}
      </Button>
    </Empty>
  );
};
