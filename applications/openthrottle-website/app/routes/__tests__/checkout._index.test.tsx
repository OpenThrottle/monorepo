import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import CheckoutIndex from '../checkout._index';
import type { StripeProductObject } from '~/__generated__/graphql';

const mockCheckoutProduct: StripeProductObject = {
  __typename: 'StripeProductObject',
  active: true,
  defaultPriceId: 'price_test',
  description: 'Test product',
  id: 'demo',
  images: [],
  name: 'Demo',
  prices: [
    {
      __typename: 'StripePriceObject',
      active: true,
      currency: 'usd',
      id: 'price_monthly',
      recurring: {
        __typename: 'StripePriceRecurringObject',
        interval: 'month',
        intervalCount: 1,
      },
      type: 'recurring',
      unitAmount: 2900,
    },
  ],
};

const mockCheckoutLoaderData = { product: mockCheckoutProduct };

function CheckoutIndexTestHarness() {
  return (
    <CheckoutIndex
      actionData={undefined}
      loaderData={mockCheckoutLoaderData}
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- minimal stub matches for route component tests
      matches={[] as any}
      params={{}}
    />
  );
}

describe('routes/checkout._index.tsx', () => {
  let component: ReturnType<typeof render>;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      {
        Component: CheckoutIndexTestHarness,
        path: '/',
      },
    ]);
    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders checkout section', () => {
    expect(component.getByTestId('CheckoutIndex')).toBeInTheDocument();
  });

  test('renders main Checkout heading', () => {
    expect(component.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Checkout',
    );
  });
});
