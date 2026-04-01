import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import CheckoutCancel from '../checkout.cancel';

describe('routes/checkout.cancel.tsx', () => {
  let component: ReturnType<typeof render>;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      {
        Component: (props: any) => (
          // Component: (props: React.ComponentProps<typeof CheckoutCancel>) => (
          <CheckoutCancel {...props} />
        ),
        path: '/',
      },
    ]);
    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders cancel section', () => {
    expect(component.getByTestId('CheckoutCancel')).toBeInTheDocument();
  });

  test('renders checkout cancelled heading', () => {
    expect(
      component.getByRole('heading', { name: /checkout cancelled/i }),
    ).toBeInTheDocument();
  });

  test('renders link back to pricing', () => {
    const link = component.getByRole('link', { name: /back to pricing/i });
    expect(link).toHaveAttribute('href', '/pricing');
  });
});
