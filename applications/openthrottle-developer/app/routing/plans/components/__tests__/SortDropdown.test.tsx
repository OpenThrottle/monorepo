import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SortDropdown } from '../SortDropdown';
import { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';
// import type { PlansSortBy, PlansSortOrder } from '../SortDropdown';

describe('SortDropdown', () => {
  test('should render with current sort and call onChange when selection changes', async () => {
    const onChange =
      vi.fn<(sortBy: PlansSortBy, sortOrder: PlansSortOrder) => void>();
    const user = userEvent.setup();
    const { getByRole } = render(
      <SortDropdown onChange={onChange} sortBy="createdAt" sortOrder="desc" />,
    );
    const select = getByRole('combobox', { name: 'Sort plans' });
    expect(select).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe('createdAt-desc');

    await user.selectOptions(select, 'updatedAt-asc');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('updatedAt', 'asc');
  });

  test('should resolve invalid value to createdAt-desc', () => {
    const { getByRole } = render(
      <SortDropdown onChange={() => {}} sortBy="createdAt" sortOrder="desc" />,
    );
    const select = getByRole('combobox', { name: 'Sort plans' });
    expect((select as HTMLSelectElement).value).toBe('createdAt-desc');
  });
});
