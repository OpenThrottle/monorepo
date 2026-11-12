import { Badge, Card } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  WORKSPACE_FOLDERS_COPY,
  WORKSPACE_REPOSITORY_DETAIL_COPY,
} from '~/routing/settings/data/data.copy';
import { RepositoryHookTelemetry } from '~/routing/settings/repositories/components/RepositoryHookTelemetry';
import { deriveCheckoutInspectionBadges } from '~/routing/settings/repositories/utils/deriveCheckoutInspectionBadges';

export interface RepositoryDetailCheckoutProps {
  checkout: NonNullable<WorkspaceRepositoryFieldsFragment['checkouts']>[number];
  defaultBranch: string | null | undefined;
}

/**
 * @description One checkout card on the repository detail page: name, path, branch
 * and managed badges, detected stack and agent config, and hook telemetry. Split out
 * of RepositoryDetail for its line cap.
 */
export const RepositoryDetailCheckout = (
  props: RepositoryDetailCheckoutProps,
): React.ReactElement => {
  const { checkout, defaultBranch } = props;

  // Hooks

  // Setup
  const branch =
    checkout.inspection?.git.currentBranch ?? defaultBranch ?? null;
  const { detectedAgentConfig, detectedStack } = deriveCheckoutInspectionBadges(
    checkout.inspection,
  );
  const hasStack = detectedStack.length > 0;
  const hasAgentConfig = detectedAgentConfig.length > 0;
  const { agentConfigLabel, stackLabel } = WORKSPACE_REPOSITORY_DETAIL_COPY;

  // Handlers

  // Markup
  const branchBadge = <Badge variant="outline">{branch}</Badge>;
  const managedBadge = (
    <Badge variant="secondary">{WORKSPACE_FOLDERS_COPY.managedBadge}</Badge>
  );
  const stackRow = (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground w-24 shrink-0 text-xs">
        {stackLabel}
      </span>
      {detectedStack.map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
    </div>
  );
  const agentConfigRow = (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground w-24 shrink-0 text-xs">
        {agentConfigLabel}
      </span>
      {detectedAgentConfig.map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className="space-y-2 rounded-md border px-3 py-2"
      data-testid={`RepositoryDetailCheckout-${checkout.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{checkout.displayName}</p>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {checkout.filesystemPath}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {branch ? branchBadge : null}
          {checkout.managed ? managedBadge : null}
        </div>
      </div>
      {hasStack ? stackRow : null}
      {hasAgentConfig ? agentConfigRow : null}
      <RepositoryHookTelemetry inspection={checkout.inspection} />
    </Card>
  );
};
