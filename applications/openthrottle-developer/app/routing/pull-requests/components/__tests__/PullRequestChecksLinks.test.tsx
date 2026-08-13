import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestChecksLinks } from '../PullRequestChecksLinks';
import type { PullRequestChecksLinksProps } from '../PullRequestChecksLinks';

const basePull: PullRequestChecksLinksProps['pull'] = {
  author: 'visormatt',
  baseRef: 'main',
  createdAt: '2026-08-01T00:00:00.000Z',
  headRef: 'feature/foo',
  headSha: 'abcdef1234567890',
  htmlUrl: 'https://github.com/OpenThrottle/monorepo/pull/1',
  mergedAt: null,
  number: 1,
  state: 'open',
  title: 'Add feature',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('PullRequestChecksLinks Component', () => {
  let component: RenderResult;
  let props: PullRequestChecksLinksProps;

  beforeEach(() => {
    props = { owner: 'OpenThrottle', pull: basePull, repo: 'monorepo' };

    component = render(<PullRequestChecksLinks {...props} />);
  });

  test('renders always-present links to the Checks tab and Commits list', () => {
    expect(
      component.getByRole('link', { name: 'Checks tab (CI rollup)' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/OpenThrottle/monorepo/pull/1/checks',
    );
    expect(
      component.getByRole('link', { name: 'Commits (per-SHA checks)' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/OpenThrottle/monorepo/pull/1/commits',
    );
  });

  test('renders head-SHA links when headSha is present', () => {
    expect(
      component.getByRole('link', { name: 'Checks at head SHA' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/OpenThrottle/monorepo/commit/abcdef1234567890/checks',
    );
    const headCommitLink = component.getByRole('link', {
      name: /Head commit/,
    });
    expect(headCommitLink).toHaveAttribute(
      'href',
      'https://github.com/OpenThrottle/monorepo/commit/abcdef1234567890',
    );
    expect(headCommitLink).toHaveTextContent('abcdef1');
  });

  test('omits head-SHA links when headSha is null', () => {
    component.unmount();
    component = render(
      <PullRequestChecksLinks
        {...props}
        pull={{ ...basePull, headSha: null }}
      />,
    );

    expect(
      component.queryByRole('link', { name: 'Checks at head SHA' }),
    ).not.toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: /Head commit/ }),
    ).not.toBeInTheDocument();
  });
});
