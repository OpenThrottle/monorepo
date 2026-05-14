import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { createRoutesStub, useSearchParams } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestPreviewSheet } from '../PullRequestPreviewSheet';
import type { PullRequestPreviewSheetProps } from '../PullRequestPreviewSheet';

const baseFilters: PullRequestPreviewSheetProps['filters'] = {
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

function PreviewHarness(
  props: PullRequestPreviewSheetProps,
): React.ReactElement {
  const [searchParams] = useSearchParams();

  return (
    <div>
      <span data-testid="search-string">{searchParams.toString()}</span>
      <PullRequestPreviewSheet {...props} />
    </div>
  );
}

describe('PullRequestPreviewSheet', () => {
  let props: PullRequestPreviewSheetProps;

  beforeEach(() => {
    props = {
      filters: baseFilters,
      listQuery: 'owner=acme&repo=demo',
      prPreviewNumber: null,
      prPreviewPull: null,
    };
  });

  test('renders preview body when the PR is in the current list', () => {
    const RoutesStub = createRoutesStub([
      {
        Component: () => (
          <PullRequestPreviewSheet
            filters={baseFilters}
            listQuery="owner=acme&repo=demo"
            prPreviewNumber={42}
            prPreviewPull={mockPull}
          />
        ),
        path: '/pull-requests',
      },
    ]);

    render(<RoutesStub initialEntries={['/pull-requests?pr=42']} />);

    expect(
      screen.getByTestId('PullRequestPreviewSheet-body'),
    ).toBeInTheDocument();
    expect(screen.getByText('Fix the thing')).toBeInTheDocument();
  });

  test('renders missing state when pr is set but the PR is not in the filtered list', () => {
    const RoutesStub = createRoutesStub([
      {
        Component: () => (
          <PullRequestPreviewSheet
            {...props}
            prPreviewNumber={404}
            prPreviewPull={null}
          />
        ),
        path: '/pull-requests',
      },
    ]);

    render(<RoutesStub initialEntries={['/pull-requests']} />);

    expect(
      screen.getByTestId('PullRequestPreviewSheet-missing'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PR #404 is not in the current filtered list/i),
    ).toBeInTheDocument();
  });

  test('removes pr from the URL when the sheet close control is activated', async () => {
    const user = userEvent.setup();
    props = {
      ...props,
      prPreviewNumber: 42,
      prPreviewPull: mockPull,
    };

    const RoutesStub = createRoutesStub([
      {
        Component: () => <PreviewHarness {...props} />,
        path: '/pull-requests',
      },
    ]);

    render(
      <RoutesStub
        initialEntries={['/pull-requests?owner=acme&repo=demo&pr=42']}
      />,
    );

    expect(screen.getByTestId('search-string')).toHaveTextContent(
      'owner=acme&repo=demo&pr=42',
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByTestId('search-string')).toHaveTextContent(
      'owner=acme&repo=demo',
    );
  });
});
