import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleAuthForm } from '../OpenThrottleAuthForm';
import type { OpenThrottleAuthFormProps } from '../OpenThrottleAuthForm';

describe('OpenThrottleAuthForm Component', () => {
  let component: ReturnType<typeof render>;
  let props: OpenThrottleAuthFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleAuthForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render email and password fields and submit button', () => {
    expect(component.getByTestId('OpenThrottleAuthForm')).toBeInTheDocument();
    expect(component.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(component.getByLabelText(/password/i)).toBeInTheDocument();
    expect(component.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('should call onSubmit with email and password when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const RoutesStub = createRoutesStub([
      {
        Component: () => <OpenThrottleAuthForm onSubmit={onSubmit} />,
        path: '/',
      },
    ]);
    component.rerender(<RoutesStub />);

    await user.type(component.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(component.getByLabelText(/password/i), 'secret');
    await user.click(component.getByRole('button', { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret',
    });
  });
});
