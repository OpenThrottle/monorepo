import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { LinkedArtifactRow } from '~/routing/plans/components/LinkedArtifactsPanel';
import {
  LINKED_ARTIFACT_FALLBACK_ICON,
  LINKED_ARTIFACT_ICONS,
} from '~/routing/plans/data/linked-artifacts-panel-icons';
import { LINKED_ARTIFACT_LIFECYCLE_STYLES } from '~/routing/plans/data/linked-artifacts-panel-lifecycle-styles';
import { LINKED_ARTIFACT_VERIFICATION_STYLES } from '~/routing/plans/data/linked-artifacts-panel-verification-styles';
import { toLinkedArtifactDestination } from '~/routing/plans/utils/linked-artifact-href';
import { toLinkedArtifactView } from '~/routing/plans/utils/linked-artifact-payload';
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
  // "verified" is only meaningful with a when; without one the badge says so.
  const verifiedWhen =
    artifact.verifiedAt == null
      ? 'not yet verified'
      : formatProducedAt(artifact.verifiedAt);

  // Handlers

  // Markup
  // Only the sha / PR number is machine identity, so only it gets monospace —
  // setting the whole row in mono would make the repo name harder to scan.
  const label =
    'monoToken' in view ? (
      <span className="font-medium">
        {view.labelPrefix}
        <span className="font-mono">{view.monoToken}</span>
      </span>
    ) : (
      <span className="font-medium">{view.label}</span>
    );

  const linkedLabel =
    destination.kind === 'external' ? (
      <a
        className="underline-offset-2 hover:underline"
        href={destination.href}
        rel="noreferrer"
        target="_blank"
      >
        {label}
      </a>
    ) : destination.kind === 'internal' ? (
      <Link className="underline-offset-2 hover:underline" to={destination.to}>
        {label}
      </Link>
    ) : (
      label
    );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs"
      data-testid="LinkedArtifactRowItem"
    >
      <Icon className="text-muted-foreground size-3.5 shrink-0" />

      {linkedLabel}

      {artifact.lifecycle != null ? (
        <Badge
          className={LINKED_ARTIFACT_LIFECYCLE_STYLES[artifact.lifecycle] ?? ''}
          size="xs"
          variant="outline"
        >
          {artifact.lifecycle}
        </Badge>
      ) : null}

      {artifact.message != null && artifact.message !== '' ? (
        <span
          className="text-muted-foreground max-w-[28rem] truncate"
          title={artifact.message}
        >
          {artifact.message}
        </span>
      ) : null}

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
