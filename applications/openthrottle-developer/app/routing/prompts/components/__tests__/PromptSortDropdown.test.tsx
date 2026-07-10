import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createRoutesStub } from 'react-router';
import { PromptSortDropdown } from '../PromptSortDropdown';
import type { PromptSortDropdownProps } from '../PromptSortDropdown';

describe('PromptSortDropdown Component', () => {
  let props: PromptSortDropdownProps;

  beforeEach(() => {
    props = {
      onChange: vi.fn(),
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    };
  });

  test('should have data-testid', () => {
    const Component = () => <PromptSortDropdown {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);
    expect(screen.getByTestId('PromptSortDropdown')).toBeInTheDocument();
  });

  test('should have aria-label', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PromptSortDropdown {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);
    expect(
      screen.getByRole('combobox', { name: 'Sort prompts' }),
    ).toBeInTheDocument();
  });

  test('should show "Recently updated" as default selected option', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PromptSortDropdown {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);
    expect(
      screen.getByRole('combobox', { name: 'Sort prompts' }),
    ).toHaveTextContent('Recently updated');
  });

  test('when user changes sort should call onChange with new sortBy and sortOrder', async () => {
    const user = userEvent.setup();
    props = {
      onChange: vi.fn(),
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PromptSortDropdown {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    await user.click(screen.getByRole('combobox', { name: 'Sort prompts' }));
    await user.click(screen.getByRole('option', { name: 'Title A-Z' }));

    expect(props.onChange).toHaveBeenCalledWith('title', 'asc');
  });
});
