import { Badge, Button } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import * as React from 'react';

import { LINKED_ARTIFACTS_PANEL_COPY } from '~/routing/plans/data/data.copy';
import { LINKED_ARTIFACT_GROUP_LABELS } from '~/routing/plans/data/linked-artifacts-panel-groups';
import type { LinkedArtifactsSummaryModel } from '~/routing/plans/utils/summarize-linked-artifacts';
import {
  ARTIFACT_FILTER_ALL,
  ARTIFACT_VERIFICATIONS,
} from '~/routing/plans/utils/summarize-linked-artifacts';

export interface LinkedArtifactsSummaryProps {
  onTypeChange: (type: string) => void;
  onVerificationChange: (verification: string) => void;
  summary: LinkedArtifactsSummaryModel;
  typeFilter: string;
  verificationFilter: string;
}

export const LinkedArtifactsSummary = (
  props: LinkedArtifactsSummaryProps,
): React.ReactElement => {
  const {
    onTypeChange,
    onVerificationChange,
    summary,
    typeFilter,
    verificationFilter,
  } = props;

  // Hooks

  // Setup
  const orphaned = summary.byVerification.orphaned ?? 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs"
      data-testid="LinkedArtifactsSummary"
    >
      <span className="font-medium">
        {summary.total} {LINKED_ARTIFACTS_PANEL_COPY.totalSuffix}
      </span>

      {ARTIFACT_VERIFICATIONS.map((verification) => (
        <span
          className={clsx(
            // An orphaned artifact is the one thing here worth acting on, so
            // it is the only count allowed to shout — and only when non-zero.
            verification === 'orphaned' && orphaned > 0
              ? 'font-semibold text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground',
          )}
          key={verification}
          title={
            verification === 'orphaned'
              ? LINKED_ARTIFACTS_PANEL_COPY.orphanedHint
              : undefined
          }
        >
          {summary.byVerification[verification] ?? 0} {verification}
        </span>
      ))}

      <div className="flex flex-wrap items-center gap-1">
        {[ARTIFACT_FILTER_ALL, ...ARTIFACT_VERIFICATIONS].map((value) => (
          <Button
            key={value}
            onClick={() => onVerificationChange(value)}
            size="xs"
            variant={verificationFilter === value ? 'secondary' : 'ghost'}
          >
            {value === ARTIFACT_FILTER_ALL
              ? LINKED_ARTIFACTS_PANEL_COPY.allVerificationsLabel
              : value}
          </Button>
        ))}
      </div>

      {/* Type filter is driven by the types actually present, never a hardcoded set. */}
      {summary.presentTypes.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          {[ARTIFACT_FILTER_ALL, ...summary.presentTypes].map((value) => (
            <Badge
              className="cursor-pointer"
              key={value}
              onClick={() => onTypeChange(value)}
              size="xs"
              variant={typeFilter === value ? 'secondary' : 'outline'}
            >
              {value === ARTIFACT_FILTER_ALL
                ? LINKED_ARTIFACTS_PANEL_COPY.allTypesLabel
                : (LINKED_ARTIFACT_GROUP_LABELS[value] ?? value)}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
};
