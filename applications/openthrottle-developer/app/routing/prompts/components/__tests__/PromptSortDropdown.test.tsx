import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { PromptSortDropdownProps } from '../PromptSortDropdown';
import { PromptSortDropdown } from '../PromptSortDropdown';

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
    const Component = () => {
      return <PromptSortDropdown {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(component.getByTestId('PromptSortDropdown')).toBeInTheDocument();
  });

  test('should have aria-label', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return <PromptSortDropdown {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(
      component.getByRole('combobox', { name: 'Sort prompts' }),
    ).toBeInTheDocument();
  });

  test('should show "Recently updated" as default selected option', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return <PromptSortDropdown {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(
      component.getByRole('combobox', { name: 'Sort prompts' }),
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
    const Component = () => {
      return <PromptSortDropdown {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    await user.click(component.getByRole('combobox', { name: 'Sort prompts' }));
    await user.click(component.getByRole('option', { name: 'Title A-Z' }));

    expect(props.onChange).toHaveBeenCalledWith('title', 'asc');
  });

  test('renders the selected label in the server markup', () => {
    // Radix fills a childless SelectValue only after hydration; the label must be in the SSR HTML.
    const html = renderToString(<PromptSortDropdown {...props} />);

    expect(html).toContain('>Recently updated<');
  });
});
