import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ComposeForm } from '../ComposeForm';
import type { ComposeFormProps } from '../ComposeForm';

describe('ComposeForm Component', () => {
  let component: RenderResult;
  let props: ComposeFormProps;

  beforeEach(async () => {
    props = {};

    const Component = () => <ComposeForm {...props} />;
    const RemixStub = createRoutesStub([
      { Component, action: vi.fn(() => undefined), path: '/' },
    ]);

    component = render(<RemixStub />);

    // Flush the router stub's hydration and formik's `validateOnMount` async
    // validation inside act() so the resulting state update is settled before
    // any test asserts — otherwise it lands outside act() and races the
    // assertions (the source of the CI-only flakiness).
    await act(async () => {});
  });

  test('should render our UI', () => {
    expect(component.getByTestId('ComposeForm')).toBeInTheDocument();
    expect(component.getByLabelText('To')).toBeInTheDocument();
    expect(component.getByLabelText('Subject')).toBeInTheDocument();
    expect(component.getByLabelText('Body')).toBeInTheDocument();
  });

  test('should render errors when form is submitted with invalid data', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Send' }));

    expect(await component.findByText('To is required.')).toBeInTheDocument();
    expect(
      await component.findByText('Subject is required.'),
    ).toBeInTheDocument();
  });

  test('should clear errors as the form is updated', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Send' }));

    expect(await component.findByText('To is required.')).toBeInTheDocument();
    expect(
      await component.findByText('Subject is required.'),
    ).toBeInTheDocument();

    await user.type(component.getByLabelText('To'), 'user@example.com');
    await user.type(component.getByLabelText('Subject'), 'Test subject');

    await waitFor(() => {
      expect(component.queryByText('To is required.')).toBe(null);
      expect(component.queryByText('Subject is required.')).toBe(null);
    });
  });
});
