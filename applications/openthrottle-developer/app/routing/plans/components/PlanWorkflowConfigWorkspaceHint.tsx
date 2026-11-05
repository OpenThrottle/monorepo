import { GitBranch } from 'lucide-react';
import * as React from 'react';

import { PLAN_RUN_WORKSPACE_SELECTOR_COPY } from '~/routing/plans/data/data.copy';

export interface PlanWorkflowConfigWorkspaceHintProps {
  /** Filesystem path of the selected checkout; undefined when none resolved. */
  readonly checkoutPath: string | undefined;
  /** True when a repository (not a specific checkout) is selected. */
  readonly hasRepository: boolean;
  /** A recorded checkout is no longer registered. */
  readonly selectedCheckoutMissing: boolean;
}

/**
 * @description The line under the Workspace select: the resolved checkout path,
 * the stale-checkout warning, or how a repository selection resolves on enqueue.
 * Renders nothing for the monorepo-root and custom-path selections.
 */
export const PlanWorkflowConfigWorkspaceHint = (
  props: PlanWorkflowConfigWorkspaceHintProps,
): React.ReactElement | null => {
  const { checkoutPath, hasRepository, selectedCheckoutMissing } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (checkoutPath !== undefined) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <GitBranch aria-hidden={true} className="size-3.5 shrink-0" />
        <span className="truncate font-mono">{checkoutPath}</span>
      </p>
    );
  }

  if (selectedCheckoutMissing) {
    return (
      <p className="text-destructive text-xs">
        {PLAN_RUN_WORKSPACE_SELECTOR_COPY.staleCheckout}
      </p>
    );
  }

  if (hasRepository) {
    return (
      <p className="text-muted-foreground text-xs">
        Resolves to your checkout of this repository on enqueue — errors if you
        have none, or more than one.
      </p>
    );
  }

  return null;
};
