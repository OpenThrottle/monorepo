import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';

import { SortDropdown } from '../SortDropdown';

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

describe('SortDropdown', () => {
  test('should render with current sort and call onChange when selection changes', async () => {
    const onChange =
      vi.fn<(sortBy: PlansSortBy, sortOrder: PlansSortOrder) => void>();
    const user = userEvent.setup();
    render(
      <SortDropdown onChange={onChange} sortBy="createdAt" sortOrder="desc" />,
    );
    const combobox = screen.getByRole('combobox', { name: 'Sort plans' });
    expect(combobox).toHaveTextContent('Newest first');

    await user.click(combobox);
    await user.click(
      screen.getByRole('option', { name: 'Least recently updated' }),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('updatedAt', 'asc');
  });

  test('should resolve invalid value to createdAt-desc', () => {
    render(
      <SortDropdown
        onChange={() => {}}
        sortBy={asMock<PlansSortBy>('invalid')}
        sortOrder="desc"
      />,
    );
    const combobox = screen.getByRole('combobox', { name: 'Sort plans' });
    expect(combobox).toHaveTextContent('Newest first');
  });
});
