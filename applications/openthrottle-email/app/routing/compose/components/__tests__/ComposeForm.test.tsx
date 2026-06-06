import * as React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ComposeForm } from '../ComposeForm';
import type { ComposeFormProps } from '../ComposeForm';

describe('ComposeForm Component', () => {
  let component: RenderResult;
  let props: ComposeFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ComposeForm {...props} />;
    const RemixStub = createRoutesStub([
      { Component, action: vi.fn(() => undefined), path: '/' },
    ]);

    component = render(<RemixStub />);
  });

  test('should render our UI', () => {
    expect(component.getByTestId('ComposeForm')).toBeInTheDocument();
    expect(component.getByLabelText('To')).toBeInTheDocument();
    expect(component.getByLabelText('Subject')).toBeInTheDocument();
    expect(component.getByLabelText('Body')).toBeInTheDocument();
  });

  test('should render errors when form is submitted with invalid data', async () => {
    const form = component.getByRole('form');

    act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(component.getByText('To is required.')).toBeInTheDocument();
      expect(component.getByText('Subject is required.')).toBeInTheDocument();
    });
  });

  test('should clear errors as the form is updated', async () => {
    const form = component.getByTestId('ComposeForm');
    const inputTo = component.getByLabelText('To');
    const inputSubject = component.getByLabelText('Subject');

    act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(component.queryByText('To is required.')).not.toBe(null);
      expect(component.queryByText('Subject is required.')).not.toBe(null);
    });

    act(() => {
      fireEvent.change(inputTo, { target: { value: 'user@example.com' } });
      fireEvent.change(inputSubject, { target: { value: 'Test subject' } });
    });

    await waitFor(() => {
      expect(component.queryByText('To is required.')).toBe(null);
      expect(component.queryByText('Subject is required.')).toBe(null);
    });
  });
});
