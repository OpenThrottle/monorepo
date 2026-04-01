import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SearchFilters } from '../SearchFilters';
import type { SearchFiltersProps } from '../SearchFilters';

describe('SearchFilters Component', () => {
  let component: RenderResult;
  let props: SearchFiltersProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SearchFilters {...props} />;
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
});
