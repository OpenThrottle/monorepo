import * as React from 'react';
import clsx from 'clsx';
import { ArrowRightIcon } from 'lucide-react';
import { Button, DataTable } from '@openthrottle/react-router-shadcn';
import { readSearchParam } from '@openthrottle/react-router-ui-global';
import { Link, useSearchParams } from 'react-router';
import { CalendarEmpty } from '~/routing/calendar/components/CalendarEmpty';
import { formatCalendarRange } from '~/routing/calendar/utils/formatters';
import type { CalendarListEvent } from '~/routing/calendar/types';
import type { ColumnDef } from '@tanstack/react-table';

export interface CalendarTableProps {
  className?: string;
  events: CalendarListEvent[];
}

export const CalendarTable = (
  props: CalendarTableProps,
): React.ReactElement => {
  const { className, events } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const search = readSearchParam(searchParams);
  const columns = React.useMemo(() => CalendarTable.buildTable(), [events]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="CalendarTable"
    >
      <DataTable<CalendarListEvent, string | number | null | undefined>
        columns={columns}
        data={events}
        emptyState={<CalendarEmpty search={search} />}
      />
    </div>
  );
};

CalendarTable.buildTable = (): ColumnDef<
  CalendarListEvent,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const event = row.original;
        const eventHref = `/calendar/${event.id}`;

        return (
          <div className="overflow-hidden p-2">
            <h2 className="mb-2 line-clamp-1 text-sm font-medium text-ellipsis">
              <Link
                aria-label={`View event: ${event.title}`}
                className="hover:text-primary underline underline-offset-2"
                to={eventHref}
                viewTransition={true}
              >
                {event.title}
              </Link>
            </h2>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {event.description.trim() || '—'}
            </p>
          </div>
        );
      },
      header: () => <div className="p-2">Event</div>,
    },
    {
      accessorKey: 'location',
      cell: ({ row }) => {
        const location = row.original.location.trim();

        return (
          <div className="text-muted-foreground p-2 text-sm">
            {location ? (
              <span aria-label={`Location: ${location}`}>{location}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        );
      },
      header: () => <div className="p-2">Location</div>,
    },
    {
      accessorKey: 'startsAt',
      cell: ({ row }) => {
        const event = row.original;
        const when = formatCalendarRange(
          event.startsAt,
          event.endsAt,
          event.allDay,
        );

        return (
          <div className="text-muted-foreground p-2 text-xs">
            <span aria-label={`When: ${when}`}>{when}</span>
          </div>
        );
      },
      header: () => <div className="p-2">When</div>,
    },
    {
      cell: ({ row }) => {
        const event = row.original;

        return (
          <div className="flex flex-wrap items-center gap-2 p-2">
            <Button
              asChild={true}
              className="text-xs"
              size="xs"
              variant="outline"
            >
              <Link
                aria-label={`View event: ${event.title}`}
                to={`/calendar/${event.id}`}
                viewTransition={true}
              >
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        );
      },
      header: () => 'Actions',
      id: 'actions',
    },
  ];
};
