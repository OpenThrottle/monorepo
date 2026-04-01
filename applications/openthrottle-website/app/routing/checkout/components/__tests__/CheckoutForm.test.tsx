import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CheckoutForm } from '../CheckoutForm';
import type { CheckoutFormProps } from '../CheckoutForm';

describe('CheckoutForm Component', () => {
  let component: RenderResult;
  let props: CheckoutFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CheckoutForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders email field and continue action', () => {
    expect(component.getByTestId('CheckoutForm')).toBeInTheDocument();
    expect(component.getByLabelText('Email')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Continue to payment' }),
    ).toBeInTheDocument();
  });
});
