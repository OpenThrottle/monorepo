import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import {
  WorktreeDiscoveryProblemKind,
  WorktreeRootSource,
} from '~/__generated__/graphql';
import { mockDiscoveredWorktrees } from '~/routing/settings/repositories/data/mock.repositories';
import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import { WorktreeDiscoveryNotice } from '../WorktreeDiscoveryNotice';
import type { DiscoveredWorktreesResult } from '~/routing/settings/repositories/data/types';

const renderNotice = (
  discoveredWorktrees: DiscoveredWorktreesResult,
  loader?: () => unknown,
): RenderResult => {
  const Component = () => (
    <WorktreeDiscoveryNotice discoveredWorktrees={discoveredWorktrees} />
  );
  const RoutesStub = createRoutesStub([{ Component, loader, path: '/' }]);

  return render(<RoutesStub />);
};

describe('WorktreeDiscoveryNotice Component', () => {
  test('names the root it scanned', () => {
    const component = renderNotice(mockDiscoveredWorktrees());

    expect(
      component.getByTestId('WorktreeDiscoveryNotice'),
    ).toBeInTheDocument();
    expect(
      component.getByText('/Users/dev/.openthrottle/worktrees/monorepo'),
    ).toBeInTheDocument();
  });

  test('re-runs discovery by revalidating the loader', async () => {
    const user = userEvent.setup();
    const loader = vi.fn(() => null);
    const component = renderNotice(mockDiscoveredWorktrees(), loader);

    // A stubbed route with a loader resolves asynchronously before it renders.
    await waitFor(() =>
      expect(
        component.getByRole('button', {
          name: WORKTREE_DISCOVERY_COPY.refreshButton,
        }),
      ).toBeInTheDocument(),
    );
    loader.mockClear();

    await user.click(
      component.getByRole('button', {
        name: WORKTREE_DISCOVERY_COPY.refreshButton,
      }),
    );

    // Discovery is a live loader read, not a mutation, so refresh is a revalidation.
    expect(loader).toHaveBeenCalled();
  });

  test('leads with a sentence and keeps the raw git output collapsed', async () => {
    const user = userEvent.setup();
    const component = renderNotice(
      mockDiscoveredWorktrees({
        problems: [
          {
            detail: 'EACCES: permission denied',
            kind: WorktreeDiscoveryProblemKind.RootUnreadable,
            path: '/srv/wt',
            repositoryId: null,
          },
        ],
      }),
    );

    expect(component.getByRole('alert')).toHaveTextContent(
      WORKTREE_DISCOVERY_COPY.degradedSummary,
    );
    // The raw line is reachable, but only once asked for.
    expect(component.queryByText(/EACCES: permission denied/)).toBeNull();

    await user.click(
      component.getByRole('button', {
        name: WORKTREE_DISCOVERY_COPY.detailsShow,
      }),
    );

    expect(
      component.getByText(/EACCES: permission denied/),
    ).toBeInTheDocument();
  });

  test('names the remedy for worktrees git still lists but no longer exist', () => {
    const component = renderNotice(
      mockDiscoveredWorktrees({
        problems: [
          {
            detail: 'the directory is gone',
            kind: WorktreeDiscoveryProblemKind.StaleWorktreeEntry,
            path: '/srv/wt/dead',
            repositoryId: null,
          },
        ],
      }),
    );

    expect(component.getByRole('alert')).toHaveTextContent(
      WORKTREE_DISCOVERY_COPY.staleRemedy,
    );
  });

  test('counts repositories with no worktrees rather than listing a failure each', () => {
    const component = renderNotice(
      mockDiscoveredWorktrees({
        scannedRoots: [
          {
            exists: false,
            path: '/srv/worktrees/org/one',
            source: WorktreeRootSource.Default,
            worktreeCount: 0,
          },
          {
            exists: false,
            path: '/srv/worktrees/org/two',
            source: WorktreeRootSource.Default,
            worktreeCount: 0,
          },
        ],
      }),
    );

    expect(
      component.getByText(`2 ${WORKTREE_DISCOVERY_COPY.emptyRootsSuffixOther}`),
    ).toBeInTheDocument();
    expect(component.queryByRole('alert')).toBeNull();
  });

  test('reports what the hard cap dropped rather than truncating silently', () => {
    const component = renderNotice(
      mockDiscoveredWorktrees({ droppedCount: 12 }),
    );

    expect(
      component.getByText(`12 ${WORKTREE_DISCOVERY_COPY.droppedCountSuffix}`),
    ).toBeInTheDocument();
  });

  test('offers a deep link to workspace settings when no root could be resolved', () => {
    const component = renderNotice(
      mockDiscoveredWorktrees({ rootSource: null, worktreeRoot: null }),
    );

    expect(
      component.getByText(WORKTREE_DISCOVERY_COPY.unconfiguredTitle),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', {
        name: WORKTREE_DISCOVERY_COPY.unconfiguredLinkLabel,
      }),
    ).toHaveAttribute('href', '/settings/workspace');
  });

  test('shows no unconfigured prompt when a root was resolved', () => {
    const component = renderNotice(mockDiscoveredWorktrees());

    expect(
      component.queryByText(WORKTREE_DISCOVERY_COPY.unconfiguredTitle),
    ).toBeNull();
    expect(component.queryByRole('alert')).toBeNull();
  });
});
