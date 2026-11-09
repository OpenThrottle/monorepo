import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import { mockDiscoveredWorktrees } from '~/routing/settings/repositories/testing/mock-repositories';

import type { WorktreeDiscoveryStatusProps } from '../WorktreeDiscoveryStatus';
import { WorktreeDiscoveryStatus } from '../WorktreeDiscoveryStatus';

const renderStatus = (
  props: WorktreeDiscoveryStatusProps,
  action: (args: { request: Request }) => Promise<unknown> = async () => {
    return null;
  },
): RenderResult => {
  const RoutesStub = createRoutesStub([
    {
      Component: () => <WorktreeDiscoveryStatus {...props} />,
      action,
      path: '/',
    },
  ]);
  return render(<RoutesStub />);
};

describe('WorktreeDiscoveryStatus Component', () => {
  describe('while the first scan is pending', () => {
    test('renders a busy status line', () => {
      const component = renderStatus({
        discoveredWorktrees: null,
        status: 'pending',
      });

      expect(component.getByRole('status')).toHaveAttribute(
        'aria-busy',
        'true',
      );
      expect(
        component.getByText(WORKTREE_DISCOVERY_COPY.pendingLabel),
      ).toBeInTheDocument();
    });
  });

  describe('when the first scan failed', () => {
    test('reports it and offers a rescan', () => {
      const component = renderStatus({
        discoveredWorktrees: null,
        status: 'rejected',
      });

      expect(component.getByRole('alert')).toHaveTextContent(
        WORKTREE_DISCOVERY_COPY.rejectedBody,
      );
      expect(
        component.getByRole('button', {
          name: WORKTREE_DISCOVERY_COPY.refreshButton,
        }),
      ).toBeEnabled();
    });

    test('rescan submits the rescanWorktrees intent to the route action', async () => {
      const user = userEvent.setup();
      const intents: unknown[] = [];
      const action = vi.fn(async ({ request }: { request: Request }) => {
        intents.push((await request.formData()).get('intent'));
        return null;
      });
      const component = renderStatus(
        { discoveredWorktrees: null, status: 'rejected' },
        action,
      );

      await user.click(
        component.getByRole('button', {
          name: WORKTREE_DISCOVERY_COPY.refreshButton,
        }),
      );

      await waitFor(() => {
        expect(intents).toEqual(['rescanWorktrees']);
      });
    });
  });

  describe('once a scan has resolved', () => {
    test('renders the scan notice rather than a status line', () => {
      const component = renderStatus({
        discoveredWorktrees: mockDiscoveredWorktrees(),
        status: 'resolved',
      });

      expect(component.getByTestId('WorktreeDiscoveryNotice')).toBeVisible();
      expect(component.queryByTestId('WorktreeDiscoveryStatus')).toBeNull();
    });
  });
});
