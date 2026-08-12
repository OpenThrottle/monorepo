import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { formatDate } from 'date-fns';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestDetailHeader } from './PullRequestDetailHeader';
import type { PullRequestDetailHeaderProps } from './PullRequestDetailHeader';

describe('PullRequestDetailHeader Component', () => {
  let component: RenderResult;
  let props: PullRequestDetailHeaderProps;

  beforeEach(() => {
    props = {
      pull: {
        author: 'octocat',
        baseRef: 'main',
        createdAt: '2026-01-01T12:00:00.000Z',
        headRef: 'feature/branch',
        headSha: 'abc123',
        htmlUrl: 'https://github.com/acme/demo/pull/42',
        mergedAt: null,
        number: 42,
        state: 'OPEN',
        title: 'Add new feature',
        updatedAt: '2026-01-02T12:00:00.000Z',
      },
    };

    component = render(<PullRequestDetailHeader {...props} />);
  });

  test('renders the title and PR number', () => {
    expect(component.getByText('Add new feature')).toBeInTheDocument();
    expect(component.getByText('#42')).toBeInTheDocument();
  });

  test('renders author and state/date summary', () => {
    const createdLabel = formatDate(props.pull.createdAt, 'MM/dd/yyyy');

    expect(component.getByText('octocat')).toBeInTheDocument();
    expect(component.getByText(/State OPEN/)).toBeInTheDocument();
    expect(
      component.getByText(new RegExp(`Created ${createdLabel}`)),
    ).toBeInTheDocument();
  });

  test('renders base and head branches', () => {
    expect(component.getByText(/Branches:/)).toBeInTheDocument();
    expect(component.getByText('main')).toBeInTheDocument();
    expect(component.getByText('feature/branch')).toBeInTheDocument();
  });

  test('renders merged date when mergedAt is set', () => {
    component.unmount();
    const mergedAt = '2026-01-03T12:00:00.000Z';
    const mergedProps: PullRequestDetailHeaderProps = {
      pull: { ...props.pull, mergedAt },
    };
    const mergedLabel = formatDate(mergedAt, 'MM/dd/yyyy');

    component = render(<PullRequestDetailHeader {...mergedProps} />);

    expect(
      component.getByText(new RegExp(`Merged ${mergedLabel}`)),
    ).toBeInTheDocument();
  });

  test('omits branches paragraph when both refs are null', () => {
    component.unmount();
    const noBranchProps: PullRequestDetailHeaderProps = {
      pull: { ...props.pull, baseRef: null, headRef: null },
    };

    component = render(<PullRequestDetailHeader {...noBranchProps} />);

    expect(component.queryByText(/Branches:/)).not.toBeInTheDocument();
  });
});
