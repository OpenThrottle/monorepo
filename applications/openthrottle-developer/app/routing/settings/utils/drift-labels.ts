/**
 * @description Checkout drift flags and their user-facing warning labels.
 * Hoisted out of WorkspaceRepositoryCard per component-primitive-shape R4.
 */

import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

export interface CheckoutDrift {
  branchMoved: boolean;
  pathMissing: boolean;
  remoteChanged: boolean;
}

export const driftLabels = (drift: CheckoutDrift): string[] => {
  const labels: string[] = [];
  if (drift.branchMoved) labels.push(WORKSPACE_FOLDERS_COPY.driftBranchMoved);
  if (drift.pathMissing) labels.push(WORKSPACE_FOLDERS_COPY.driftPathMissing);
  if (drift.remoteChanged) {
    labels.push(WORKSPACE_FOLDERS_COPY.driftRemoteChanged);
  }
  return labels;
};
