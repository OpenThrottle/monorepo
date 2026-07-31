import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { LINKED_ARTIFACT_VERIFICATION_STYLES } from '~/routing/plans/data/linked-artifacts-panel-verification-styles';
import {
  formatProducedAt,
  toMillis,
} from '~/routing/plans/utils/linked-artifacts-panel';

export interface LinkedArtifactRow {
  externalKey: string;
  id: string;
  lifecycle?: string | null;
  // The GraphQL Date scalar arrives as epoch millis (number) or an ISO string.
  producedAt: number | string;
  source: string;
  type: string;
  verification: string;
}

export interface LinkedArtifactsPanelProps {
  artifacts: LinkedArtifactRow[];
}

export const LinkedArtifactsPanel = (
  props: LinkedArtifactsPanelProps,
): React.ReactElement | null => {
  const { artifacts } = props;

  // Hooks

  // Setup
  // Newest first (the query already orders by producedAt DESC; keep it stable here too).
  const ordered = [...artifacts].sort(
    (a, b) => toMillis(b.producedAt) - toMillis(a.producedAt),
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div data-testid="LinkedArtifactsPanel">
      <ul className="flex flex-col gap-2">
        {ordered.map((artifact) => (
          <li
            className="flex flex-wrap items-center gap-2 text-xs"
            key={artifact.id}
          >
            <Badge
              className={
                LINKED_ARTIFACT_VERIFICATION_STYLES[artifact.verification] ?? ''
              }
              title={`Verification: ${artifact.verification}`}
            >
              {artifact.verification}
            </Badge>
            <span className="font-medium">{artifact.type}</span>
            <span className="text-muted-foreground">
              {artifact.externalKey}
            </span>
            {artifact.lifecycle != null ? (
              <span className="text-muted-foreground">
                · {artifact.lifecycle}
              </span>
            ) : null}
            <span className="text-muted-foreground">via {artifact.source}</span>
            <span className="text-muted-foreground">
              {formatProducedAt(artifact.producedAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
