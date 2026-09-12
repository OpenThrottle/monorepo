import { Skeleton } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

/** Placeholder rows shown while the ledger promise is in flight. */
const PLACEHOLDER_ROWS = 3;

export interface LinkedArtifactsPanelSkeletonProps {}

export const LinkedArtifactsPanelSkeleton = (): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-2"
      data-testid="LinkedArtifactsPanelSkeleton"
    >
      <Skeleton className="h-3 w-40" />
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <Skeleton className="h-3 w-64" key={index} />
      ))}
    </div>
  );
};
