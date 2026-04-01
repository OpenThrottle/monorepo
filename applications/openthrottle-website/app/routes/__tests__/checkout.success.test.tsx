import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import CheckoutSuccess from '../checkout.success';

describe('routes/checkout.success.tsx', () => {
  let component: ReturnType<typeof render>;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      {
        Component: (props: any) => <CheckoutSuccess {...props} />,
        path: '/',
      },
    ]);
    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders success section', () => {
    expect(component.getByTestId('CheckoutSuccess')).toBeInTheDocument();
  });

  test('renders thank you heading', () => {
    expect(
      component.getByRole('heading', { name: /thank you/i }),
    ).toBeInTheDocument();
  });

  test('renders link back to home', () => {
    const link = component.getByRole('link', { name: /back to home/i });
    expect(link).toHaveAttribute('href', '/');
  });
});
