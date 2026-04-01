import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CheckoutSummary } from '../CheckoutSummary';
import type { CheckoutSummaryProps } from '../CheckoutSummary';

describe('CheckoutSummary Component', () => {
  let component: RenderResult;
  let props: CheckoutSummaryProps;

  beforeEach(() => {
    props = {
      lineItems: [
        { interval: 'monthly', label: 'High Octane', priceCents: 2900 },
      ],
    };

    const Component = () => <CheckoutSummary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders line items and total', () => {
    expect(component.getByText('Order summary')).toBeInTheDocument();
    expect(component.getByText('High Octane (monthly)')).toBeInTheDocument();
    expect(component.getAllByText('$29.00').length).toBe(2);
  });
});
