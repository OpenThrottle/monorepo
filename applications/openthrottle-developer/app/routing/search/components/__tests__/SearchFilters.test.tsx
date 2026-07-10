import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { SearchFilters } from '../SearchFilters';
import type { SearchFiltersProps } from '../SearchFilters';

function SearchFiltersWithQueryString(props: SearchFiltersProps) {
  const [searchParams] = useSearchParams();
  return (
    <>
      <SearchFilters {...props} />
      <span data-testid="current-search">{searchParams.toString()}</span>
    </>
  );
}

describe('SearchFilters Component', () => {
  let component: RenderResult;
  let props: SearchFiltersProps;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    props = {};

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <SearchFiltersWithQueryString {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have data-testid and results-per-page control', () => {
    const wrapper = component.getByTestId('SearchFilters');
    expect(wrapper).toBeInTheDocument();
    const select = component.getByRole('combobox', {
      name: /results per page/i,
    });
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('10');
  });

  test('should update URL when limit is changed', async () => {
    const user = userEvent.setup();
    const select = component.getByRole('combobox', {
      name: /results per page/i,
    });
    await user.selectOptions(select, '20');
    expect(select).toHaveValue('20');
  });

  test('should set limit and reset page to 1 while preserving other params', async () => {
    cleanup();
    const user = userEvent.setup();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <SearchFiltersWithQueryString {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const view = render(
      <RoutesStub initialEntries={['/?q=alpha&limit=10&page=3']} />,
    );

    const select = view.getByRole('combobox', {
      name: /results per page/i,
    });
    await user.selectOptions(select, '50');

    await waitFor(() => {
      const qs = new URLSearchParams(
        view.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('limit')).toBe('50');
      expect(qs.get('page')).toBe('1');
      expect(qs.get('q')).toBe('alpha');
    });
  });
});
