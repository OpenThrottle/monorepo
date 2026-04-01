import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
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
    expect(component.getByLabelText('search')).toBeInTheDocument();
  });

  test('should render errors when form is submitted with invalid data', async () => {
    const form = component.getByRole('form');

    act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(component.getByText('Search is required.')).not.toBe(null);
    });
  });

  test('should clear errors as the form is updated', async () => {
    const form = component.getByTestId('<%= name %>');
    const inputSearch = component.getByLabelText('search');

    act(() => {
      fireEvent.submit(form);
    });

    // Renders all the errors
    await waitFor(() => {
      expect(component.queryByText('Search is required.')).not.toBe(null);
    });

    act(() => {
      fireEvent.change(inputSearch, { target: { value: 'a search' } });
    });

    await waitFor(() => {
      // component.debug(undefined, 200_000);

      expect(component.queryByText('Search is required.')).toBe(null);
    });
  });
});
