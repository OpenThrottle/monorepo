import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PricingCard } from '../PricingCard';
import type { PricingCardProps } from '../PricingCard';

describe('PricingCard Component', () => {
  let component: RenderResult;
  let props: PricingCardProps;

  beforeEach(() => {
    props = {
      index: 0,
      product: {
        active: false,
        description: `Try OpenThrottle with full access for 7 days. No credit card required.`,
        id: 'demo',
        images: [],
        name: 'Demo',
        prices: [],
      },
      yearly: false,
    };

    const Component = () => <PricingCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  describe('when rendering tier content', () => {
    test('renders tier name', () => {
      expect(component.getByText('Demo')).toBeInTheDocument();
    });

    test('renders price for monthly billing', () => {
      expect(component.getByText('$0.00')).toBeInTheDocument();
      expect(component.getByText('/mo')).toBeInTheDocument();
    });

    test('renders CTA button with Contact Us when no default price', () => {
      const cta = component.getByRole('button', { name: 'Contact Us' });
      expect(cta).toBeInTheDocument();
    });
  });

  describe('when tier is non-demo (index > 0)', () => {
    beforeEach(() => {
      props = {
        index: 1,
        product: {
          active: true,
          defaultPriceId: 'price_123',
          description: `Pro tier`,
          id: 'pro',
          images: [],
          name: 'High Octane',
          prices: [
            {
              __typename: 'StripePriceObject',
              active: true,
              currency: 'usd',
              id: 'pm',
              recurring: {
                __typename: 'StripePriceRecurringObject',
                interval: 'month',
                intervalCount: 1,
              },
              type: 'recurring',
              unitAmount: 2900,
            },
          ],
        },
        yearly: false,
      };

      const Component = () => <PricingCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub initialEntries={['/']} />);
    });

    test('wraps non-demo tier in shimmer border', () => {
      expect(
        component.container.querySelector('.shimmer-border'),
      ).toBeInTheDocument();
    });

    test('renders tier name and Get Started CTA', () => {
      expect(component.getByText('High Octane')).toBeInTheDocument();
      expect(
        component.getByRole('button', { name: 'Get Started' }),
      ).toBeInTheDocument();
    });
  });

  describe('when billingInterval is yearly', () => {
    beforeEach(() => {
      props = {
        index: 1,
        product: {
          active: true,
          defaultPriceId: 'price_123',
          description: `Pro tier`,
          id: 'pro',
          images: [],
          name: 'High Octane',
          prices: [
            {
              __typename: 'StripePriceObject',
              active: true,
              currency: 'usd',
              id: 'pm',
              recurring: {
                __typename: 'StripePriceRecurringObject',
                interval: 'month',
                intervalCount: 1,
              },
              type: 'recurring',
              unitAmount: 2900,
            },
            {
              __typename: 'StripePriceObject',
              active: true,
              currency: 'usd',
              id: 'py',
              recurring: {
                __typename: 'StripePriceRecurringObject',
                interval: 'year',
                intervalCount: 1,
              },
              type: 'recurring',
              unitAmount: 29000,
            },
          ],
        },
        yearly: true,
      };

      const Component = () => <PricingCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub initialEntries={['/']} />);
    });

    test('renders yearly price', () => {
      expect(component.getByText('$290.00')).toBeInTheDocument();
      expect(component.getByText('/yr')).toBeInTheDocument();
    });
  });

  describe('when ctaTo is provided', () => {
    beforeEach(() => {
      props = {
        ctaTo: '/checkout?plan=demo&interval=monthly',
        index: 0,
        product: {
          active: true,
          description: `Try OpenThrottle with full access for 7 days. No credit card required.`,
          id: 'demo',
          images: [],
          name: 'Demo',
          prices: [],
        },
        yearly: false,
      };

      const Component = () => <PricingCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub initialEntries={['/']} />);
    });

    test('renders CTA as link with correct href', () => {
      const link = component.getByRole('link', { name: 'Contact Us' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        '/checkout?plan=demo&interval=monthly',
      );
    });
  });
});
