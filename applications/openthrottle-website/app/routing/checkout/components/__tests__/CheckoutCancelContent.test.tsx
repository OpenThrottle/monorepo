import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CheckoutCancelContent } from '../CheckoutCancelContent';
import type { CheckoutCancelContentProps } from '../CheckoutCancelContent';

describe('CheckoutCancelContent Component', () => {
  let component: RenderResult;
  let props: CheckoutCancelContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CheckoutCancelContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders cancellation copy and link to pricing', () => {
    expect(component.getByTestId('CheckoutCancelContent')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'Checkout cancelled' }),
    ).toBeInTheDocument();
    expect(
      component.getByText('Your checkout was cancelled. No charge was made.'),
    ).toBeInTheDocument();
    const pricing = component.getByRole('link', { name: 'Back to pricing' });
    expect(pricing).toHaveAttribute('href', '/pricing');
  });
});
