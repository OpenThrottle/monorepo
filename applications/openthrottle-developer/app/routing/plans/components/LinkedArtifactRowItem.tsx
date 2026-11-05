import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { LinkedArtifactRowLabel } from '~/routing/plans/components/LinkedArtifactRowLabel';
import type { LinkedArtifactRow } from '~/routing/plans/components/LinkedArtifactsPanel';
import {
  LINKED_ARTIFACT_FALLBACK_ICON,
  LINKED_ARTIFACT_ICONS,
} from '~/routing/plans/data/data.linked-artifacts-panel-icons';
import { LINKED_ARTIFACT_LIFECYCLE_STYLES } from '~/routing/plans/data/data.linked-artifacts-panel-lifecycle-styles';
import { LINKED_ARTIFACT_VERIFICATION_STYLES } from '~/routing/plans/data/data.linked-artifacts-panel-verification-styles';
import { toLinkedArtifactDestination } from '~/routing/plans/utils/linked-artifact-href';
import { toLinkedArtifactView } from '~/routing/plans/utils/linked-artifact-payload';
import { getLinkedArtifactVerifiedWhen } from '~/routing/plans/utils/linked-artifact-verified-when';
import {
  formatProducedAt,
  formatProducedAtRelative,
} from '~/routing/plans/utils/linked-artifacts-panel';

export interface LinkedArtifactRowItemProps {
  artifact: LinkedArtifactRow;
  /**
   * Plan id from the route params. A task status_change payload carries only
   * the task id, so in-app links cannot be built without it.
   */
  planId: string | null;
}

export const LinkedArtifactRowItem = (
  props: LinkedArtifactRowItemProps,
): React.ReactElement => {
  const { artifact, planId } = props;

  // Hooks

  // Setup
  const view = toLinkedArtifactView(artifact);
  const destination = toLinkedArtifactDestination(view, planId);
  const Icon =
    LINKED_ARTIFACT_ICONS[view.iconKey] ?? LINKED_ARTIFACT_FALLBACK_ICON;
  const verifiedWhen = getLinkedArtifactVerifiedWhen(artifact.verifiedAt);
  const lifecycleStyle =
    LINKED_ARTIFACT_LIFECYCLE_STYLES[artifact.lifecycle ?? ''];

  // Handlers

  // Markup
  const lifecycleBadge = artifact.lifecycle != null && (
    <Badge className={lifecycleStyle ?? ''} size="xs" variant="outline">
      {artifact.lifecycle}
    </Badge>
  );
  const messageText = artifact.message != null && artifact.message !== '' && (
    <span
      className="text-muted-foreground max-w-[28rem] truncate"
      title={artifact.message}
    >
      {artifact.message}
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs"
      data-testid="LinkedArtifactRowItem"
    >
      <Icon className="text-muted-foreground size-3.5 shrink-0" />

      <LinkedArtifactRowLabel destination={destination} view={view} />

      {lifecycleBadge}

      {messageText}

      <Badge
        className={
          LINKED_ARTIFACT_VERIFICATION_STYLES[artifact.verification] ?? ''
        }
        size="xs"
        title={`Verification: ${artifact.verification} · ${verifiedWhen}`}
        variant="outline"
      >
        {artifact.verification}
      </Badge>

      <span
        className="text-muted-foreground"
        title={formatProducedAt(artifact.producedAt)}
      >
        {formatProducedAtRelative(artifact.producedAt)}
      </span>

      <span className="text-muted-foreground/60">via {artifact.source}</span>
    </div>
  );
};
