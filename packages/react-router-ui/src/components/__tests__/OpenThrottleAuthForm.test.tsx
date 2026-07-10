import * as React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OpenThrottleAuthForm } from '../OpenThrottleAuthForm';
import type { OpenThrottleAuthFormProps } from '../OpenThrottleAuthForm';

describe('OpenThrottleAuthForm Component', () => {
  let component: ReturnType<typeof render>;
  let props: OpenThrottleAuthFormProps;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleAuthForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render email and password inputs empty by default', () => {
    // Regression guard: prefilled credentials were removed, so the inputs must
    // render empty unless an explicit defaultEmail/defaultPassword is passed.
    expect(component.getByTestId('auth-email-input')).toHaveValue('');
    expect(component.getByTestId('auth-password-input')).toHaveValue('');
  });

  test('should render email and password fields and submit button', () => {
    expect(component.getByTestId('OpenThrottleAuthForm')).toBeInTheDocument();
    expect(
      component.getByRole('textbox', { name: /email/i }),
    ).toBeInTheDocument();
    expect(component.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  test('should call onSubmit with email and password when form is submitted', async () => {
    cleanup();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp -- test-local mock component
        Component: () => <OpenThrottleAuthForm onSubmit={onSubmit} />,
        path: '/',
      },
    ]);
    render(<RoutesStub />);

    const email = screen.getByRole('textbox', { name: /email/i });
    const password = screen.getByLabelText(/password/i);
    await user.clear(email);
    await user.clear(password);
    await user.type(email, 'test@example.com');
    await user.type(password, 'secret');
    const form = screen.getByTestId('OpenThrottleAuthForm');
    await user.click(
      within(form).getByRole('button', {
        // exact: true,
        name: 'Sign in',
      }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret',
    });
  });
});
