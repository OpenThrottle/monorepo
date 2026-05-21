import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import type {
  ProjectsSortBy,
  ProjectsSortOrder,
} from '~/routing/prompts/config/types';
import { ProjectsSortDropdown } from '../ProjectsSortDropdown';

describe('ProjectsSortDropdown', () => {
  test('renders current sort label and calls onChange when selection changes', async () => {
    const onChange =
      vi.fn<(sortBy: ProjectsSortBy, sortOrder: ProjectsSortOrder) => void>();
    const user = userEvent.setup();
    render(
      <ProjectsSortDropdown
        onChange={onChange}
        sortBy="createdAt"
        sortOrder="desc"
      />,
    );
    const combobox = screen.getByRole('combobox', { name: 'Sort projects' });
    expect(combobox).toHaveTextContent('Newest first');

    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: 'Name A-Z' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('name', 'asc');
  });

  test('resolves invalid sort pair to createdAt-desc display', () => {
    render(
      <ProjectsSortDropdown
        onChange={() => {}}
        sortBy={'invalid' as ProjectsSortBy}
        sortOrder="desc"
      />,
    );
    const combobox = screen.getByRole('combobox', { name: 'Sort projects' });
    expect(combobox).toHaveTextContent('Newest first');
  });
});
