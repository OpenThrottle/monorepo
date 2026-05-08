import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
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
      component.getByRole('columnheader', { name: 'State' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Author' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Dates' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Refs' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Actions' }),
    ).toBeInTheDocument();
  });

  test('shows empty state when pulls is empty', () => {
    expect(component.getByText('No results.')).toBeInTheDocument();
  });

  test('matches snapshot for empty list', () => {
    expect(component.baseElement).toMatchSnapshot();
  });

  describe('when pulls are provided', () => {
    beforeEach(() => {
      cleanup();
      props = {
        filters: baseFilters,
        listQuery: '',
        pulls: [mockPull],
      };
      const Component = () => <PullRequestsTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('renders ref cells for head and base', () => {
      const table = component.getByRole('table');
      expect(table).toHaveTextContent('main');
      expect(table).toHaveTextContent('feature/foo');
      expect(table).toHaveTextContent('deadbee');
    });

    test('renders action links with expected GitHub and portal targets', () => {
      const portalLink = component.getByRole('link', { name: 'In portal' });
      expect(portalLink).toHaveAttribute('href', '/pull-requests/42');

      const githubPr = component.getByRole('link', { name: 'GitHub PR' });
      expect(githubPr).toHaveAttribute(
        'href',
        'https://github.com/acme/demo/pull/42',
      );

      const checks = component.getByRole('link', { name: 'Checks (CI)' });
      expect(checks).toHaveAttribute(
        'href',
        'https://github.com/acme/demo/pull/42/checks',
      );

      const headCommit = component.getByRole('link', { name: /Head/ });
      expect(headCommit).toHaveAttribute(
        'href',
        'https://github.com/acme/demo/commit/deadbeef1234567890abcdef',
      );
    });

    test('includes list query in portal link when listQuery is set', () => {
      cleanup();
      props = {
        filters: baseFilters,
        listQuery: 'state=open',
        pulls: [mockPull],
      };
      const Component = () => <PullRequestsTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);

      const portalLink = component.getByRole('link', { name: 'In portal' });
      expect(portalLink).toHaveAttribute(
        'href',
        '/pull-requests/42?state=open',
      );
    });

    test('matches snapshot with one pull', () => {
      expect(component.baseElement).toMatchSnapshot();
    });
  });
});
