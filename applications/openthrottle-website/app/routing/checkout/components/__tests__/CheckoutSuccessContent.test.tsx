import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CheckoutSuccessContent } from '../CheckoutSuccessContent';
import type { CheckoutSuccessContentProps } from '../CheckoutSuccessContent';

describe('CheckoutSuccessContent Component', () => {
  let component: RenderResult;
  let props: CheckoutSuccessContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CheckoutSuccessContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders confirmation copy and link home', () => {
    expect(component.getByTestId('CheckoutSuccessContent')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'Thank you' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        'Your payment was successful. You now have access to your plan.',
      ),
    ).toBeInTheDocument();
    const home = component.getByRole('link', { name: 'Back to home' });
    expect(home).toHaveAttribute('href', '/');
  });
});
