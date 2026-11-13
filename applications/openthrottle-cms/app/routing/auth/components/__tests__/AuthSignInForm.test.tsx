import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { AUTH_COPY } from '~/routing/auth/data/data.copy';

import type { AuthSignInFormProps } from '../AuthSignInForm';
import { AuthSignInForm } from '../AuthSignInForm';

const renderForm = (overrides: Partial<AuthSignInFormProps> = {}) => {
  const submitted: FormData[] = [];
  const props: AuthSignInFormProps = {
    className: undefined,
    error: undefined,
    isSubmitting: false,
    redirectTo: '/fragments/abc',
    ...overrides,
  };
  const Component = () => {
    return <AuthSignInForm {...props} />;
  };
  const action = async (args: { readonly request: Request }) => {
    submitted.push(await args.request.formData());
    return null;
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

  return { component: render(<RoutesStub />), submitted };
};

describe('AuthSignInForm', () => {
  test('posts the email, password and return path', async () => {
    const { component, submitted } = renderForm();

    await userEvent.type(component.getByLabelText(AUTH_COPY.emailLabel), 'editor@example.test'); // prettier-ignore
    await userEvent.type(component.getByLabelText(AUTH_COPY.passwordLabel), 'secret'); // prettier-ignore
    await userEvent.click(component.getByRole('button', { name: AUTH_COPY.submit })); // prettier-ignore

    await waitFor(() => {
      expect(submitted).toHaveLength(1);
    });
    expect(submitted[0]?.get('email')).toBe('editor@example.test');
    expect(submitted[0]?.get('password')).toBe('secret');
    expect(submitted[0]?.get('redirectTo')).toBe('/fragments/abc');
  });

  test('shows the last error', () => {
    const { component } = renderForm({ error: 'Nope' });

    expect(component.getByRole('alert')).toHaveTextContent('Nope');
  });

  test('disables submit while submitting', () => {
    const { component } = renderForm({ isSubmitting: true });

    expect(component.getByRole('button', { name: AUTH_COPY.submitting })).toBeDisabled(); // prettier-ignore
  });
});
