import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import type { PullRequestsListFilters } from '~/routing/pull-requests/types/pull-requests-list-filters';
import { PullRequestsToolbar } from '../PullRequestsToolbar';
import type { PullRequestsToolbarProps } from '../PullRequestsToolbar';

const baseFilters: PullRequestsListFilters = {
  author: 'alice',
  authorExact: true,
  base: 'main',
  merged: true,
  owner: 'acme',
  repo: 'demo',
  state: 'closed',
};

describe('PullRequestsToolbar Component', () => {
  let component: RenderResult;
  let props: PullRequestsToolbarProps;

  beforeEach(() => {
    props = { filters: baseFilters };

    const Component = () => <PullRequestsToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('submits as GET and exposes owner, repo, and state controls', () => {
    const form = component.container.querySelector('form');
    expect(form).not.toBeNull();
    expect(form).toHaveAttribute('method', 'get');

    const owners = component.getAllByPlaceholderText('org or user');
    expect(owners[0]).toHaveValue('acme');

    const repos = component.getAllByPlaceholderText('repository name');
    expect(repos[0]).toHaveValue('demo');

    const stateSelects = (form as HTMLFormElement).querySelectorAll(
      'select[name="state"]',
    );
    expect(stateSelects.length).toBeGreaterThanOrEqual(1);
    expect(stateSelects[0]).toHaveValue('closed');
  });

  test('renders extended filters with base, author exact, and merged defaults', () => {
    expect(component.getByLabelText('Base branch (optional)')).toHaveValue(
      'main',
    );
    expect(component.getByLabelText('Author (optional)')).toHaveValue('alice');
    expect(
      component.getByRole('checkbox', {
        name: /Exact login match/i,
      }),
    ).toBeChecked();
    expect(component.getByLabelText('Merged (optional)')).toHaveValue('true');
  });

  test('renders apply and reset actions', () => {
    expect(
      component.getByRole('button', { name: 'Apply filters' }),
    ).toBeInTheDocument();
    const resetLinks = component.getAllByRole('link', { name: 'Reset' });
    expect(resetLinks).toHaveLength(2);
    resetLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/pull-requests');
    });
  });
});
