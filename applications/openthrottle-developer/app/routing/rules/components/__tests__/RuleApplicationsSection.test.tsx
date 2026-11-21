import { cleanup, render, within } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import type { RuleApplicationRowData } from '~/routing/rules/utils/rule-applications';

import { RuleApplicationsSection } from '../RuleApplicationsSection';

const row = (
  overrides: Partial<RuleApplicationRowData> & { id: string; state: string },
): RuleApplicationRowData => {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    planId: 'plan-1',
    planTitle: 'Ship it',
    ruleId: 'rule-1',
    ...overrides,
  };
};

const renderSection = (
  applications: RuleApplicationRowData[],
): ReturnType<typeof render> => {
  const Component = (): React.ReactElement => {
    return <RuleApplicationsSection applications={applications} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('RuleApplicationsSection', () => {
  afterEach(() => {
    cleanup();
  });

  test('shows one empty message and no groups without rows', () => {
    const component = renderSection([]);

    expect(component.getByTestId('RuleApplicationsEmpty')).toBeInTheDocument();
    expect(component.queryAllByTestId('RuleApplicationsGroup')).toHaveLength(0);
  });

  test('groups rows by state with the attention queue first and hides empty groups', () => {
    const component = renderSection([
      row({ id: 'a', state: 'applied' }),
      row({ id: 'b', state: 'flagged' }),
      row({ id: 'c', state: 'orphaned' }),
    ]);

    const groups = component.getAllByTestId('RuleApplicationsGroup');

    expect(groups.map((group) => group.getAttribute('data-state'))).toEqual([
      'flagged',
      'orphaned',
      'applied',
    ]);
  });

  test('links each row to its plan, falling back to a short plan id', () => {
    const component = renderSection([
      row({ id: 'a', state: 'applied' }),
      row({
        id: 'b',
        planId: 'abcdef12-0000-0000-0000-000000000000',
        planTitle: null,
        state: 'applied',
      }),
    ]);

    const links = component.getAllByRole('link');

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/plans/plan-1',
      '/plans/abcdef12-0000-0000-0000-000000000000',
    ]);
    expect(links[1]).toHaveTextContent('abcdef12');
  });

  test('renders the details of a row', () => {
    const component = renderSection([
      row({
        detailsJson: '{"reason":"superseded-by","ruleId":"rule-2"}',
        id: 'a',
        state: 'flagged',
      }),
    ]);

    const rowElement = component.getByTestId('RuleApplicationRow');

    expect(
      within(rowElement).getByTestId('RuleApplicationDetails'),
    ).toBeInTheDocument();
    expect(
      within(rowElement).getByRole('link', { name: 'rule-2' }),
    ).toHaveAttribute('href', '/rules/rule-2');
  });
});
