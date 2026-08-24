import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { GLOBAL_POPOVER_COPY } from '@openthrottle/react-router-ui-global';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PULL_REQUESTS_ROW_ACTIONS_COPY } from '~/routing/pull-requests/data/data.copy';
import { PullRequestsTable } from '../PullRequestsTable';
import type { PullRequestsTableProps } from '../PullRequestsTable';

const baseFilters: PullRequestsTableProps['filters'] = {
  author: '',
  authorExact: false,
  base: '',
  merged: undefined,
  owner: 'acme',
  repo: 'demo',
  state: 'open',
};

const mockPull: PullRequestCardFragment = {
  author: 'visormatt',
  baseRef: 'main',
  createdAt: '2026-01-01T12:00:00.000Z',
  headRef: 'feature/foo',
  headSha: 'deadbeef1234567890abcdef',
  htmlUrl: 'https://github.com/acme/demo/pull/42',
  mergedAt: null,
  number: 42,
  state: 'open',
  title: 'Fix the thing',
  updatedAt: '2026-01-02T12:00:00.000Z',
};

describe('PullRequestsTable Component', () => {
  let component: RenderResult;
  let props: PullRequestsTableProps;

  beforeEach(() => {
    props = {
      filters: baseFilters,
      listQuery: '',
      pulls: [],
    };

    const Component = () => <PullRequestsTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders table shell', () => {
    expect(component.getByTestId('PullRequestsTable')).toBeInTheDocument();
    expect(component.getByRole('table')).toBeInTheDocument();
  });

  test('renders column headers', () => {
    expect(
      component.getByRole('columnheader', { name: 'Title' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Author' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', {
        name: GLOBAL_POPOVER_COPY.actionsHeader,
      }),
    ).toBeInTheDocument();
  });

  test('shows empty state when pulls is empty', () => {
    expect(component.getByText('No results.')).toBeInTheDocument();
  });

  describe('when pulls are provided', () => {
    beforeEach(() => {
      cleanup();
      props = {
        filters: baseFilters,
        listQuery: '',
        pulls: [mockPull],
      };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PullRequestsTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('renders row title and author', () => {
      const table = component.getByRole('table');
      expect(table).toHaveTextContent('Fix the thing');
      expect(table).toHaveTextContent('visormatt');
      expect(table).toHaveTextContent('deadbee');
    });

    test('renders preview, full-page, GitHub, and checks targets in the menu', async () => {
      const user = userEvent.setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      await user.click(
        component.getByRole('button', {
          name: `${PULL_REQUESTS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} #42`,
        }),
      );

      const preview = component.getByRole('menuitem', {
        name: PULL_REQUESTS_ROW_ACTIONS_COPY.previewSidePanel,
      });
      expect(preview).toHaveAttribute('href', '/pull-requests?pr=42');

      const portalLink = component.getByRole('menuitem', {
        name: PULL_REQUESTS_ROW_ACTIONS_COPY.openFullPage,
      });
      expect(portalLink).toHaveAttribute('href', '/pull-requests/42');

      await user.click(
        component.getByRole('menuitem', {
          name: PULL_REQUESTS_ROW_ACTIONS_COPY.githubPr,
        }),
      );
      expect(openSpy).toHaveBeenCalledWith(
        'https://github.com/acme/demo/pull/42',
        '_blank',
        'noopener,noreferrer',
      );

      await user.click(
        component.getByRole('button', {
          name: `${PULL_REQUESTS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} #42`,
        }),
      );
      await user.click(
        component.getByRole('menuitem', {
          name: PULL_REQUESTS_ROW_ACTIONS_COPY.checksCi,
        }),
      );
      expect(openSpy).toHaveBeenCalledWith(
        'https://github.com/acme/demo/pull/42/checks',
        '_blank',
        'noopener,noreferrer',
      );

      const headCommit = component.getByRole('link', { name: /Head/ });
      expect(headCommit).toHaveAttribute(
        'href',
        'https://github.com/acme/demo/commit/deadbeef1234567890abcdef',
      );

      openSpy.mockRestore();
    });

    test('includes list query in preview and full-page links when listQuery is set', async () => {
      cleanup();
      props = {
        filters: baseFilters,
        listQuery: 'state=open',
        pulls: [mockPull],
      };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PullRequestsTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);

      const user = userEvent.setup();
      await user.click(
        component.getByRole('button', {
          name: `${PULL_REQUESTS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} #42`,
        }),
      );

      const preview = component.getByRole('menuitem', {
        name: PULL_REQUESTS_ROW_ACTIONS_COPY.previewSidePanel,
      });
      expect(preview).toHaveAttribute(
        'href',
        '/pull-requests?state=open&pr=42',
      );

      const portalLink = component.getByRole('menuitem', {
        name: PULL_REQUESTS_ROW_ACTIONS_COPY.openFullPage,
      });
      expect(portalLink).toHaveAttribute(
        'href',
        '/pull-requests/42?state=open',
      );
    });
  });
});
