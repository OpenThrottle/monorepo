import * as React from 'react';
import { Link } from 'react-router';

import type { LinkedArtifactDestination } from '~/routing/plans/utils/linked-artifact-href';
import type { LinkedArtifactView } from '~/routing/plans/utils/linked-artifact-payload';

export interface LinkedArtifactRowLabelProps {
  destination: LinkedArtifactDestination;
  view: LinkedArtifactView;
}

/**
 * @description The artifact row's label, linked to its external or in-app
 * destination when it has one. Only the sha / PR number is machine identity, so
 * only it gets monospace — setting the whole row in mono would make the repo
 * name harder to scan.
 */
export const LinkedArtifactRowLabel = (
  props: LinkedArtifactRowLabelProps,
): React.ReactElement => {
  const { destination, view } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const plainLabel = <span className="font-medium">{view.label}</span>;
  const monoLabel = 'monoToken' in view && (
    <span className="font-medium">
      {view.labelPrefix}
      <span className="font-mono">{view.monoToken}</span>
    </span>
  );
  const label = monoLabel || plainLabel;

  // Life Cycle

  // 🔌 Short Circuit
  if (destination.kind === 'external') {
    return (
      <a
        className="underline-offset-2 hover:underline"
        href={destination.href}
        rel="noreferrer"
        target="_blank"
      >
        {label}
      </a>
    );
  }

  if (destination.kind === 'internal') {
    return (
      <Link className="underline-offset-2 hover:underline" to={destination.to}>
        {label}
      </Link>
    );
  }

  return label;
};
