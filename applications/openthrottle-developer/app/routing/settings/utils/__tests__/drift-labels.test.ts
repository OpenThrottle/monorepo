import { describe, expect, test } from 'vitest';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import type { CheckoutDrift } from '../drift-labels';
import { driftLabels } from '../drift-labels';

const noDrift: CheckoutDrift = {
  branchMoved: false,
  pathMissing: false,
  remoteChanged: false,
};

describe('driftLabels', () => {
  test('returns an empty array when nothing has drifted', () => {
    expect(driftLabels(noDrift)).toEqual([]);
  });

  test('includes the branch-moved label', () => {
    expect(driftLabels({ ...noDrift, branchMoved: true })).toEqual([
      WORKSPACE_FOLDERS_COPY.driftBranchMoved,
    ]);
  });

  test('includes the path-missing label', () => {
    expect(driftLabels({ ...noDrift, pathMissing: true })).toEqual([
      WORKSPACE_FOLDERS_COPY.driftPathMissing,
    ]);
  });

  test('includes the remote-changed label', () => {
    expect(driftLabels({ ...noDrift, remoteChanged: true })).toEqual([
      WORKSPACE_FOLDERS_COPY.driftRemoteChanged,
    ]);
  });

  test('includes all labels in order when everything has drifted', () => {
    expect(
      driftLabels({
        branchMoved: true,
        pathMissing: true,
        remoteChanged: true,
      }),
    ).toEqual([
      WORKSPACE_FOLDERS_COPY.driftBranchMoved,
      WORKSPACE_FOLDERS_COPY.driftPathMissing,
      WORKSPACE_FOLDERS_COPY.driftRemoteChanged,
    ]);
  });
});
