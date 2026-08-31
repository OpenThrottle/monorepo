import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PlanCheckoutSelector } from '../PlanCheckoutSelector';
import type { PlanCheckoutSelectorProps } from '../PlanCheckoutSelector';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { PLAN_CHECKOUT_SELECTOR_COPY } from '~/routing/plans/data/data.copy';

type Checkout = PlanRunConfigRepositoryFieldsFragment['checkouts'][number];

const buildCheckout = (overrides: Partial<Checkout> = {}): Checkout => ({
  displayName: 'monorepo',
  filesystemPath: '/Users/me/monorepo',
  id: 'checkout-1',
  inspection: { git: { currentBranch: 'main', defaultBranch: 'main' } },
  kind: 'PRIMARY',
  managed: false,
  ...overrides,
});

const buildRepository = (
  overrides: Partial<PlanRunConfigRepositoryFieldsFragment> = {},
): PlanRunConfigRepositoryFieldsFragment => ({
  checkouts: [buildCheckout()],
  defaultBranch: null,
  id: 'repo-1',
  name: 'monorepo',
  normalizedRemoteUrl: 'github.com/OpenThrottle/monorepo',
  projectId: null,
  ...overrides,
});

const renderSelector = (
  overrides: Partial<PlanCheckoutSelectorProps> = {},
): RenderResult =>
  renderRoutesStub(
    <PlanCheckoutSelector
      checkoutId=""
      onCheckoutChange={vi.fn()}
      repositories={Promise.resolve([buildRepository()])}
      {...overrides}
    />,
  );

describe('PlanCheckoutSelector Component', () => {
  test('renders the picker once the deferred repositories resolve', async () => {
    const component = renderSelector();

    expect(
      await component.findByTestId('PlanCheckoutSelector'),
    ).toBeInTheDocument();
    expect(component.getByTestId('ChatCheckoutSelector-trigger')).toBeEnabled();
  });

  test('pre-fills the trigger from the plan run config checkout', async () => {
    const component = renderSelector({ checkoutId: 'checkout-1' });

    const trigger = await component.findByTestId(
      'ChatCheckoutSelector-trigger',
    );

    expect(trigger).toHaveTextContent('monorepo');
    expect(
      component.getByTestId('ChatCheckoutSelector-branch'),
    ).toHaveTextContent('main');
  });

  test('reports the picked checkout id', async () => {
    const onCheckoutChange = vi.fn();
    const component = renderSelector({
      onCheckoutChange,
      repositories: Promise.resolve([
        buildRepository({
          checkouts: [
            buildCheckout({ displayName: 'primary', id: 'checkout-1' }),
            buildCheckout({ displayName: 'worktree', id: 'checkout-2' }),
          ],
        }),
      ]),
    });

    await userEvent.click(
      await component.findByTestId('ChatCheckoutSelector-trigger'),
    );
    await userEvent.click(await component.findByText('worktree'));

    expect(onCheckoutChange).toHaveBeenCalledWith('checkout-2');
  });

  test('disables the trigger and explains why when nothing is registered', async () => {
    const component = renderSelector({
      repositories: Promise.resolve([]),
    });

    expect(
      await component.findByTestId('ChatCheckoutSelector-trigger'),
    ).toBeDisabled();

    await userEvent.hover(component.getByTestId('PlanCheckoutSelector'));

    expect(
      await component.findByText(PLAN_CHECKOUT_SELECTOR_COPY.emptyRegistryHint),
    ).toBeInTheDocument();
  });

  test('stays usable and explains a checkout that is no longer registered', async () => {
    const component = renderSelector({ checkoutId: 'checkout-gone' });

    expect(
      await component.findByTestId('ChatCheckoutSelector-trigger'),
    ).toBeEnabled();

    await userEvent.hover(component.getByTestId('PlanCheckoutSelector'));

    expect(
      await component.findByText(PLAN_CHECKOUT_SELECTOR_COPY.staleCheckoutHint),
    ).toBeInTheDocument();
  });
});

describe('PlanCheckoutSelector Component — minimal mode', () => {
  test('explains the icon-only trigger on hover', async () => {
    const component = renderSelector({
      checkoutId: 'checkout-1',
      minimal: true,
    });

    const trigger = await component.findByTestId(
      'ChatCheckoutSelector-trigger',
    );
    expect(trigger).not.toHaveTextContent('monorepo');

    await userEvent.hover(component.getByTestId('PlanCheckoutSelector'));

    expect(
      await component.findByText(PLAN_CHECKOUT_SELECTOR_COPY.minimalHint),
    ).toBeInTheDocument();
  });

  test('prefers a caller-supplied minimalHint over the default copy', async () => {
    const component = renderSelector({
      checkoutId: 'checkout-1',
      minimal: true,
      minimalHint: 'Plan-specific wording',
    });

    await component.findByTestId('ChatCheckoutSelector-trigger');
    await userEvent.hover(component.getByTestId('PlanCheckoutSelector'));

    expect(
      await component.findByText('Plan-specific wording'),
    ).toBeInTheDocument();
    expect(
      component.queryByText(PLAN_CHECKOUT_SELECTOR_COPY.minimalHint),
    ).not.toBeInTheDocument();
  });

  test('lets the empty-registry hint outrank minimalHint', async () => {
    const component = renderSelector({
      minimal: true,
      minimalHint: 'Plan-specific wording',
      repositories: Promise.resolve([]),
    });

    await component.findByTestId('ChatCheckoutSelector-trigger');
    await userEvent.hover(component.getByTestId('PlanCheckoutSelector'));

    expect(
      await component.findByText(PLAN_CHECKOUT_SELECTOR_COPY.emptyRegistryHint),
    ).toBeInTheDocument();
  });

  test('lets the stale-selection hint outrank minimalHint', async () => {
    const component = renderSelector({
      checkoutId: 'checkout-gone',
      minimal: true,
      minimalHint: 'Plan-specific wording',
    });

    await component.findByTestId('ChatCheckoutSelector-trigger');
    await userEvent.hover(component.getByTestId('PlanCheckoutSelector'));

    expect(
      await component.findByText(PLAN_CHECKOUT_SELECTOR_COPY.staleCheckoutHint),
    ).toBeInTheDocument();
  });

  test('leaves a healthy non-minimal selector without a tooltip', async () => {
    const component = renderSelector({ checkoutId: 'checkout-1' });

    await component.findByTestId('ChatCheckoutSelector-trigger');
    await userEvent.hover(component.getByTestId('PlanCheckoutSelector'));

    expect(
      component.queryByText(PLAN_CHECKOUT_SELECTOR_COPY.minimalHint),
    ).not.toBeInTheDocument();
  });
});
