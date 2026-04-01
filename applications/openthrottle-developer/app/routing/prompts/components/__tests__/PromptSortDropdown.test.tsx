import * as React from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PromptSortDropdown } from '../PromptSortDropdown';
import type { PromptSortDropdownProps } from '../PromptSortDropdown';

describe('PromptSortDropdown Component', () => {
  let component: RenderResult;
  let props: PromptSortDropdownProps;

  beforeEach(() => {
    props = {
      onChange: vi.fn(),
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    };

    const Component = () => <PromptSortDropdown {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have data-testid', () => {
    expect(
      component.getByTestId('PromptSortDropdown'),
    ).toBeInTheDocument();
  });

  test('should have aria-label', () => {
    expect(component.getByLabelText('Sort prompts')).toBeInTheDocument();
  });

  test('should show "Recently updated" as default selected option', () => {
    const select = component.getByTestId(
      'PromptSortDropdown',
    ) as HTMLSelectElement;
    expect(select.value).toBe('updatedAt-desc');
  });

  describe('when user changes sort', () => {
    beforeEach(() => {
      cleanup();
      props = {
        onChange: vi.fn(),
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      };

      const Component = () => <PromptSortDropdown {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);

      const select = component.getByTestId('PromptSortDropdown');
      fireEvent.change(select, { target: { value: 'title-asc' } });
    });

    test('should call onChange with new sortBy and sortOrder', () => {
      expect(props.onChange).toHaveBeenCalledWith('title', 'asc');
    });
  });
});
