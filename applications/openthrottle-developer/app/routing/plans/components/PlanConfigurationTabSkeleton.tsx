import * as React from 'react';
import { Skeleton } from '@openthrottle/react-router-shadcn';

export interface PlanConfigurationTabSkeletonProps {
  className?: string;
}

/**
 * @description Pending stand-in for the Configuration tab while
 * `workspaceRepositories` resolves — the field that the whole deferral exists
 * for (~1.3s cold). Mirrors the run-config form's fieldset stack: a legend over
 * label + control pairs, so the tab does not jump when the repositories land.
 */
export const PlanConfigurationTabSkeleton = (
  props: PlanConfigurationTabSkeletonProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const fieldsets = [
    { fields: [0, 1, 2] },
    { fields: [0, 1] },
    { fields: [0, 1, 2] },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-busy="true"
      className={className}
      data-testid="PlanConfigurationTabSkeleton"
    >
      {fieldsets.map((fieldset, index) => (
        <div
          className="border-border/60 mb-4 space-y-3 rounded-md border p-4"
          key={index}
        >
          <Skeleton className="h-4 w-44" />

          {fieldset.fields.map((field) => (
            <div className="space-y-1.5" key={field}>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
