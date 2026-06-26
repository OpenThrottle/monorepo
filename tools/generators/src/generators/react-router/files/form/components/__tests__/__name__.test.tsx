import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { <%= name %> } from '../<%= name %>';
import type { <%= name %>Props } from '../<%= name %>';

describe('<%= name %> Component', () => {
  let component: RenderResult;
  let props: <%= name %>Props;

  beforeEach(() => {
    props = {};

    const Component = () => <<%= name %> {...props} />;
    const RemixStub = createRoutesStub([
      { Component, action: vi.fn(() => undefined), path: '/' },
    ]);

    component = render(<RemixStub />);
  });

  test('should render our UI', () => {
    expect(component.getByTestId('<%= name %>')).toBeInTheDocument();
    expect(component.getByLabelText('Search')).toBeInTheDocument();
  });

  test('should render errors when form is submitted with invalid data', async () => {
    const submitButton = component.getByRole('button', { name: 'Submit' });

    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(component.getByText('Search is required.')).not.toBe(null);
    });
  });

  test('should clear errors as the form is updated', async () => {
    const submitButton = component.getByRole('button', { name: 'Submit' });
    const inputSearch = component.getByLabelText('Search');

    await userEvent.click(submitButton);

    // Renders all the errors
    await waitFor(() => {
      expect(component.queryByText('Search is required.')).not.toBe(null);
    });

    await userEvent.type(inputSearch, 'a search');

    await waitFor(() => {
      expect(component.queryByText('Search is required.')).toBe(null);
    });
  });
});
