import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
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

  test('renders scan warnings as an alert', () => {
    const component = renderNotice(
      mockDiscoveredWorktrees({
        warnings: ['worktree root /srv/wt could not be read: EACCES'],
      }),
    );

    expect(component.getByRole('alert')).toHaveTextContent(
      'worktree root /srv/wt could not be read: EACCES',
    );
    expect(
      component.getByText(WORKTREE_DISCOVERY_COPY.warningsTitle),
    ).toBeInTheDocument();
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
