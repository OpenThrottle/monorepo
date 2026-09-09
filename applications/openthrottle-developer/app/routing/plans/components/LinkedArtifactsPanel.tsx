import * as React from 'react';
import { useParams } from 'react-router';
import { LinkedArtifactGroup } from '~/routing/plans/components/LinkedArtifactGroup';
import { LinkedArtifactRowItem } from '~/routing/plans/components/LinkedArtifactRowItem';
import { LinkedArtifactsSummary } from '~/routing/plans/components/LinkedArtifactsSummary';
import { LINKED_ARTIFACTS_PANEL_COPY } from '~/routing/plans/data/data.copy';
import { groupLinkedArtifacts } from '~/routing/plans/utils/group-linked-artifacts';
import {
  ARTIFACT_FILTER_ALL,
  filterLinkedArtifacts,
  summarizeLinkedArtifacts,
} from '~/routing/plans/utils/summarize-linked-artifacts';

export interface LinkedArtifactRow {
  // The GraphQL Date scalar arrives as epoch millis (number) or an ISO string.
  createdAt: number | string;
  externalKey: string;
  id: string;
  lifecycle?: string | null;
  message?: string | null;
  /** JSON-serialized per-type payload; parse defensively, never trust its shape. */
  payloadJson: string;
  producedAt: number | string;
  sessionId: string;
  source: string;
  type: string;
  verification: string;
  verifiedAt?: number | string | null;
}

export interface LinkedArtifactsPanelProps {
  artifacts: LinkedArtifactRow[];
}

export const LinkedArtifactsPanel = (
  props: LinkedArtifactsPanelProps,
): React.ReactElement | null => {
  const { artifacts } = props;

  // Hooks
  // planId comes from the route, not the ledger row: a task status_change
  // payload carries only the task id.
  const { planId } = useParams();
  // Filter state stays local on purpose: plan-route search params revalidate
  // the loader, which would thrash the deferred ledger boundary per click.
  const [verificationFilter, setVerificationFilter] =
    React.useState(ARTIFACT_FILTER_ALL);
  const [typeFilter, setTypeFilter] = React.useState(ARTIFACT_FILTER_ALL);

  // Setup
  const summary = summarizeLinkedArtifacts(artifacts);
  const visible = filterLinkedArtifacts(
    artifacts,
    verificationFilter,
    typeFilter,
  );
  // Grouped by type, ordered by human value; rows within a group stay newest-first.
  const groups = groupLinkedArtifacts(visible);

  // Handlers
  const renderRow = (artifact: LinkedArtifactRow): React.ReactNode => (
    <LinkedArtifactRowItem artifact={artifact} planId={planId ?? null} />
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3" data-testid="LinkedArtifactsPanel">
      <LinkedArtifactsSummary
        onTypeChange={setTypeFilter}
        onVerificationChange={setVerificationFilter}
        summary={summary}
        typeFilter={typeFilter}
        verificationFilter={verificationFilter}
      />

      {/* A filter emptying the list is NOT the empty ledger — that returns null. */}
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {LINKED_ARTIFACTS_PANEL_COPY.filteredEmpty}
        </p>
      ) : null}

      {groups.map((group) => (
        <LinkedArtifactGroup
          collapsedByDefault={group.collapsedByDefault}
          count={group.count}
          key={group.type}
          label={group.label}
          renderRow={renderRow}
          rows={group.rows}
        />
      ))}
    </div>
  );
};
