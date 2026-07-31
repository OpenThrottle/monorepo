import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from '@openthrottle/react-router-shadcn';

export interface MessageDetailSkeletonProps {}

/**
 * @description Loading skeleton for the {@link MessageDetail} reading pane
 * (header + body lines), shown when the loader defers or fetches async.
 */
export const MessageDetailSkeleton = (
  _props: MessageDetailSkeletonProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="MessageDetailSkeleton">
      <CardHeader className="space-y-2">
        <Skeleton
          className="h-6 w-3/4"
          data-testid="MessageDetail-skeleton-title"
        />
        <Skeleton
          className="h-4 w-full"
          data-testid="MessageDetail-skeleton-description"
        />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton
          className="h-4 w-full"
          data-testid="MessageDetail-skeleton-line1"
        />
        <Skeleton
          className="h-4 w-full"
          data-testid="MessageDetail-skeleton-line2"
        />
        <Skeleton
          className="h-4 w-2/3"
          data-testid="MessageDetail-skeleton-line3"
        />
      </CardContent>
    </Card>
  );
};
