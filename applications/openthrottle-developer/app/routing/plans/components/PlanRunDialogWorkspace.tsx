import { cn } from '@openthrottle/react-router-shadcn';
import { GitBranchIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { PLAN_RUN_DIALOG_COPY } from '~/routing/plans/data/data.copy';
import { toPlanCheckoutOptions } from '~/routing/plans/utils/plan-checkout-options';
import { getPlanConfigurationTabHref } from '~/routing/plans/utils/plan-run-dialog';

export interface PlanRunDialogWorkspaceProps {
  /** @description Run branch; blank renders as "not set" (submit is gated on it). */
  readonly branch: string;
  readonly checkoutId: string;
  readonly className?: string;

  /** @description Fired when the Configuration link is followed, so the dialog can close. */
  readonly onNavigate: () => void;

  /** @description Resolved registered repositories, used only to name the checkout. */
  readonly repositories: readonly PlanRunConfigRepositoryFieldsFragment[];
  readonly workingDirectory: string;
}

/**
 * @description READ-ONLY branch and checkout summary for the Run dialog, with a link to
 * the plan's Configuration tab where both are edited. Branch and checkout are enqueue
 * inputs, not plan settings the dialog can change.
 */
export const PlanRunDialogWorkspace = (
  props: PlanRunDialogWorkspaceProps,
): React.ReactElement => {
  const {
    branch,
    checkoutId,
    className,
    onNavigate,
    repositories,
    workingDirectory,
  } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_DIALOG_COPY;
  const checkout = toPlanCheckoutOptions(repositories).find(
    (option) => option.id === checkoutId,
  );
  const checkoutText =
    checkout?.label ??
    (workingDirectory.trim() !== '' ? workingDirectory : undefined);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={cn(
        'bg-muted/40 flex flex-col gap-2 rounded-lg border p-3 text-sm',
        className,
      )}
      data-testid="PlanRunDialogWorkspace"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {copy.workspaceHeading}
        </h3>
        <Link
          className="text-primary text-xs underline-offset-4 hover:underline"
          data-testid="PlanRunDialogWorkspace-link"
          onClick={onNavigate}
          to={getPlanConfigurationTabHref()}
        >
          {copy.configurationLinkLabel}
        </Link>
      </div>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
        <dt className="text-muted-foreground flex items-center gap-1">
          <GitBranchIcon aria-hidden={true} className="size-3.5" />
          {copy.workspaceBranchLabel}
        </dt>
        <dd className="font-mono" data-testid="PlanRunDialogWorkspace-branch">
          {branch.trim() === '' ? '—' : branch}
        </dd>
        <dt className="text-muted-foreground">{copy.checkoutLabel}</dt>
        <dd
          className="truncate font-mono"
          data-testid="PlanRunDialogWorkspace-checkout"
        >
          {checkoutText ?? copy.checkoutNone}
        </dd>
      </dl>
      <p className="text-muted-foreground text-xs">{copy.workspaceNotice}</p>
    </section>
  );
};
