import * as React from 'react';
import { render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Index from '../pricing._index';
import type { StripeProductObject } from '~/__generated__/graphql';

const priceMonth = (id: string, unitAmount: number) => ({
  __typename: 'StripePriceObject' as const,
  active: true,
  currency: 'usd',
  id,
  recurring: {
    __typename: 'StripePriceRecurringObject' as const,
    interval: 'month',
    intervalCount: 1,
  },
  type: 'recurring',
  unitAmount,
});

const priceYear = (id: string, unitAmount: number) => ({
  __typename: 'StripePriceObject' as const,
  active: true,
  currency: 'usd',
  id,
  recurring: {
    __typename: 'StripePriceRecurringObject' as const,
    interval: 'year',
    intervalCount: 1,
  },
  type: 'recurring',
  unitAmount,
});

const mockPricingLoaderData: { products: StripeProductObject[] } = {
  products: [
    {
      __typename: 'StripeProductObject',
      active: true,
      defaultPriceId: null,
      description:
        'Try OpenThrottle with full access for 7 days. No credit card required.',
      id: 'demo',
      images: [],
      name: 'Demo',
      prices: [],
    },
    {
      __typename: 'StripeProductObject',
      active: true,
      defaultPriceId: 'price_pro_default',
      description: 'Pro tier',
      id: 'pro',
      images: [],
      name: 'High Octane',
      prices: [priceMonth('pm_pro', 2900), priceYear('py_pro', 29000)],
    },
  ],
};

function PricingIndexTestHarness() {
  return (
    <Index
      actionData={undefined}
      loaderData={mockPricingLoaderData}
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- minimal stub matches for route component tests
      matches={[] as any}
      params={{}}
    />
  );
}

describe('routes/pricing._index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      {
        Component: PricingIndexTestHarness,
        path: '/',
      },
    ]);
    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders pricing section', () => {
    expect(component.getByTestId('PricingSection')).toBeInTheDocument();
  });

  test('renders main Pricing heading', () => {
    expect(component.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Pricing',
    );
  });

  test('renders individual tier cards (Demo, High Octane)', () => {
    const cards = component.getAllByTestId('PricingCard');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  test('wires product tier CTAs to checkout with plan and interval', () => {
    const demoLink = component.getByRole('link', { name: 'Contact Us' });
    expect(demoLink).toHaveAttribute(
      'href',
      '/checkout?plan=demo&interval=monthly',
    );
    const proLink = component.getByRole('link', { name: 'Get Started' });
    expect(proLink).toHaveAttribute(
      'href',
      '/checkout?plan=pro&interval=monthly',
    );
  });

  test('defaults to monthly interval when no search param', () => {
    expect(component.getByTestId('PricingToggle')).toBeInTheDocument();
    const monthlyTab = component.getByRole('tab', { name: 'Monthly' });
    expect(monthlyTab).toHaveAttribute('data-state', 'active');
  });

  test('uses yearly interval when ?interval=yearly in URL', () => {
    const RoutesStub = createRoutesStub([
      {
        Component: PricingIndexTestHarness,
        path: '/',
      },
    ]);
    const rendered = render(
      <RoutesStub initialEntries={['/?interval=yearly']} />,
    );
    const yearlyTabs = rendered.getAllByRole('tab', { name: 'Yearly' });
    const activeYearly = yearlyTabs.find(
      (el) => el.getAttribute('data-state') === 'active',
    );
    expect(activeYearly).toBeDefined();
  });

  test('uses yearly interval when ?interval=Yearly (case-insensitive)', () => {
    const RoutesStub = createRoutesStub([
      {
        Component: PricingIndexTestHarness,
        path: '/',
      },
    ]);
    const rendered = render(
      <RoutesStub initialEntries={['/?interval=Yearly']} />,
    );
    const yearlyTabs = rendered.getAllByRole('tab', { name: 'Yearly' });
    const activeYearly = yearlyTabs.find(
      (el) => el.getAttribute('data-state') === 'active',
    );
    expect(activeYearly).toBeDefined();
  });

  describe('displayed pricing for monthly and yearly', () => {
    test('displays monthly pricing when interval is monthly', () => {
      expect(component.getByText('$29.00')).toBeInTheDocument();
      expect(component.getAllByText('/mo').length).toBeGreaterThan(0);
      const monthlyTab = component
        .getByTestId('PricingToggle')
        .querySelector('[data-state="active"]');
      expect(monthlyTab).toHaveTextContent('Monthly');
    });

    test('displays yearly pricing when interval is yearly in URL', () => {
      const RoutesStub = createRoutesStub([
        {
          Component: PricingIndexTestHarness,
          path: '/',
        },
      ]);
      const rendered = render(
        <RoutesStub initialEntries={['/?interval=yearly']} />,
      );
      expect(rendered.getByText('$290.00')).toBeInTheDocument();
      expect(rendered.getAllByText('/yr').length).toBeGreaterThan(0);
      const yearlyTabs = rendered.getAllByRole('tab', { name: 'Yearly' });
      const activeYearly = yearlyTabs.find(
        (el) => el.getAttribute('data-state') === 'active',
      );
      expect(activeYearly).toBeDefined();
    });

    test('clicking Yearly tab updates displayed pricing to yearly', async () => {
      const user = userEvent.setup();
      const toggle = within(component.getByTestId('PricingToggle'));
      await user.click(toggle.getByRole('tab', { name: 'Yearly' }));
      expect(await component.findByText('$290.00')).toBeInTheDocument();
      expect(component.getAllByText('/yr').length).toBeGreaterThan(0);
    });

    test('clicking Monthly tab updates displayed pricing to monthly', async () => {
      const RoutesStub = createRoutesStub([
        {
          Component: PricingIndexTestHarness,
          path: '/',
        },
      ]);
      const rendered = render(
        <RoutesStub initialEntries={['/?interval=yearly']} />,
      );
      const user = userEvent.setup();
      const toggleEl = rendered.getAllByTestId('PricingToggle')[0];

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const toggle = within(toggleEl as HTMLElement);
      await user.click(toggle.getByRole('tab', { name: 'Monthly' }));
      expect(await rendered.findByText('$29.00')).toBeInTheDocument();
      expect(rendered.getAllByText('/mo').length).toBeGreaterThan(0);
    });
  });
});
