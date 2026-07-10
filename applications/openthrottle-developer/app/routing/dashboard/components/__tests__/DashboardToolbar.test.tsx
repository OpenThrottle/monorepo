import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { DashboardToolbar } from '../DashboardToolbar';
import type { DashboardToolbarProps } from '../DashboardToolbar';

function DashboardToolbarWithQueryString(props: DashboardToolbarProps) {
  const [searchParams] = useSearchParams();
  return (
    <>
      <DashboardToolbar {...props} />
      <span data-testid="current-search">{searchParams.toString()}</span>
    </>
  );
}

function renderToolbar(
  initialEntry = '/',
): RenderResult & { RoutesStub: ReturnType<typeof createRoutesStub> } {
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => <DashboardToolbarWithQueryString />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  const view = render(<RoutesStub initialEntries={[initialEntry]} />);
  return { ...view, RoutesStub };
}

describe('DashboardToolbar Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders toolbar region and org/repo selectors with defaults', () => {
    const component = renderToolbar();

    expect(component.getByTestId('DashboardToolbar')).toBeInTheDocument();
    expect(component.getAllByRole('combobox')).toHaveLength(2);
    expect(component.getByText('openthrottle')).toBeInTheDocument();
    expect(component.getByText('monorepo')).toBeInTheDocument();
  });

  test('should reflect owner and repo from initial search params', () => {
    const component = renderToolbar('/?owner=shiftsmartinc&repo=native-apps');

    expect(component.getByText('shiftsmartinc')).toBeInTheDocument();
    expect(component.getByText('native-apps')).toBeInTheDocument();
  });

  test('should update owner and reset repo when organization changes', async () => {
    const user = userEvent.setup();
    const component = renderToolbar('/?owner=openthrottle&repo=monorepo');

    const [orgSelect] = component.getAllByRole('combobox');
    await user.click(orgSelect);
    await user.click(component.getByRole('option', { name: 'visormatt' }));

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('owner')).toBe('visormatt');
      expect(qs.get('repo')).toBe('monorepo');
    });
  });

  test('should update repo when repository changes', async () => {
    const user = userEvent.setup();
    const component = renderToolbar('/?owner=openthrottle&repo=monorepo');

    const [, repoSelect] = component.getAllByRole('combobox');
    await user.click(repoSelect);
    await user.click(component.getByRole('option', { name: 'openthrottle' }));

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('owner')).toBe('openthrottle');
      expect(qs.get('repo')).toBe('openthrottle');
    });
  });

  test('should preserve unrelated search params when org changes', async () => {
    const user = userEvent.setup();
    const component = renderToolbar(
      '/?modal=daily-stats&owner=openthrottle&repo=monorepo',
    );

    const [orgSelect] = component.getAllByRole('combobox');
    await user.click(orgSelect);
    await user.click(component.getByRole('option', { name: 'shiftsmartinc' }));

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('modal')).toBe('daily-stats');
      expect(qs.get('owner')).toBe('shiftsmartinc');
      expect(qs.get('repo')).toBe('monorepo');
    });
  });
});
