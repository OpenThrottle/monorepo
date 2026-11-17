import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { PullRequestsListFilters } from '~/routing/pull-requests/types/pull-requests-list-filters';

import type { PullRequestsToolbarProps } from '../PullRequestsToolbar';
import { PullRequestsToolbar } from '../PullRequestsToolbar';

const baseFilters: PullRequestsListFilters = {
  author: 'alice',
  authorExact: true,
  base: 'main',
  merged: true,
  owner: 'acme',
  repo: 'demo',
  state: 'closed',
};

const toolbarProps: PullRequestsToolbarProps = { filters: baseFilters };

const ToolbarRoute = (): React.ReactElement => {
  return <PullRequestsToolbar {...toolbarProps} />;
};

describe('PullRequestsToolbar Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      { Component: ToolbarRoute, path: '/' },
    ]);

    component = render(<RoutesStub />);
  });

  test('submits as GET and exposes owner, repo, and state controls', () => {
    const form = component.container.querySelector('form');
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Expected a form element');
    }
    expect(form).toHaveAttribute('method', 'get');

    const owners = component.getAllByPlaceholderText('org or user');
    expect(owners[0]).toHaveValue('acme');

    const repos = component.getAllByPlaceholderText('repository name');
    expect(repos[0]).toHaveValue('demo');

    const stateSelects = form.querySelectorAll('select[name="state"]');
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

  describe('stats state', () => {
    const renderAt = (entry: string): RenderResult => {
      const RoutesStub = createRoutesStub([
        { Component: ToolbarRoute, path: '/pull-requests' },
      ]);

      return render(<RoutesStub initialEntries={[entry]} />);
    };

    const getStatsInput = (view: RenderResult): Element | null => {
      return view.container.querySelector('form input[name="stats"]');
    };

    test('carries stats=open through the GET submit while the panel is open', () => {
      const view = renderAt('/pull-requests?stats=open');

      const input = getStatsInput(view);
      expect(input).toHaveAttribute('type', 'hidden');
      expect(input).toHaveValue('open');
    });

    test('adds no stats field while the panel is closed', () => {
      const view = renderAt('/pull-requests');

      expect(getStatsInput(view)).toBeNull();
    });
  });
});
