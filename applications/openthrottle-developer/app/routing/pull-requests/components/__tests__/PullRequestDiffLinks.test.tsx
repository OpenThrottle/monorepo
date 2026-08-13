import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestDiffLinks } from '../PullRequestDiffLinks';
import type { PullRequestDiffLinksProps } from '../PullRequestDiffLinks';

describe('PullRequestDiffLinks Component', () => {
  let component: RenderResult;
  let props: PullRequestDiffLinksProps;

  beforeEach(() => {
    props = {
      owner: 'openthrottle',
      pull: {
        author: 'visormatt',
        baseRef: 'main',
        createdAt: '2026-08-01T00:00:00.000Z',
        headRef: 'feature-branch',
        headSha: 'abc123',
        htmlUrl: 'https://github.com/openthrottle/monorepo/pull/42',
        mergedAt: null,
        number: 42,
        state: 'OPEN',
        title: 'Add feature',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
      repo: 'monorepo',
    };
    component = render(<PullRequestDiffLinks {...props} />);
  });

  test('renders the compare, conversation, files, workflows, and primary links', () => {
    expect(
      component.getByRole('link', { name: 'Compare base…head' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/openthrottle/monorepo/compare/main...feature-branch',
    );
    expect(
      component.getByRole('link', { name: 'Conversation' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/openthrottle/monorepo/pull/42',
    );
    expect(
      component.getByRole('link', { name: 'Files changed' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/openthrottle/monorepo/pull/42/files',
    );
    expect(
      component.getByRole('link', { name: '.github/workflows' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/openthrottle/monorepo/tree/HEAD/.github/workflows',
    );
    expect(
      component.getByRole('link', { name: 'Primary GitHub URL' }),
    ).toHaveAttribute('href', props.pull.htmlUrl);
  });

  test('omits the compare link when baseRef or headRef is missing', () => {
    component.unmount();
    props = {
      ...props,
      pull: { ...props.pull, baseRef: null },
    };
    component = render(<PullRequestDiffLinks {...props} />);

    expect(
      component.queryByRole('link', { name: 'Compare base…head' }),
    ).not.toBeInTheDocument();
  });
});
