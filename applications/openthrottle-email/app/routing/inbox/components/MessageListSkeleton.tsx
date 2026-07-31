import * as React from 'react';
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';

export interface MessageListSkeletonProps {
  /** When true, render the leading checkbox column to match the real table. */
  readonly selectionEnabled: boolean;
}

/**
 * @description Loading skeleton table for {@link MessageList}, shown while
 * the loader defers or a navigation is pending.
 */
export const MessageListSkeleton = (
  props: MessageListSkeletonProps,
): React.ReactElement => {
  const { selectionEnabled } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Table data-testid="MessageListSkeleton">
      <TableHeader>
        <TableRow>
          {selectionEnabled && <TableHead className="w-10" />}
          <TableHead className="w-[40%]">Subject</TableHead>
          <TableHead className="w-[30%]">From</TableHead>
          <TableHead className="w-[20%]">Date</TableHead>
          <TableHead className="w-[10%]">Read</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            {selectionEnabled && (
              <TableCell className="w-10">
                <Skeleton className="h-4 w-4 rounded" />
              </TableCell>
            )}
            <TableCell>
              <Skeleton className="h-4 w-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
