import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PricingToggle } from '../PricingToggle';
import type { PricingToggleProps } from '../PricingToggle';

describe('PricingToggle Component', () => {
  let component: RenderResult;
  let props: PricingToggleProps;

  beforeEach(() => {
    props = {
      onValueChange: () => {},
      value: 'monthly',
    };

    const Component = () => <PricingToggle {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  afterEach(() => {
    cleanup();
  });

  test('renders Monthly and Yearly tabs', () => {
    expect(component.getByRole('tab', { name: 'Monthly' })).toBeInTheDocument();
    expect(component.getByRole('tab', { name: 'Yearly' })).toBeInTheDocument();
  });

  describe('when switching between monthly and yearly', () => {
    test('calls onValueChange with yearly when Yearly tab is clicked', async () => {
      cleanup();
      const onValueChange = vi.fn();
      component = render(
        <PricingToggle onValueChange={onValueChange} value="monthly" />,
      );

      const user = userEvent.setup();
      await user.click(component.getByRole('tab', { name: 'Yearly' }));

      expect(onValueChange).toHaveBeenCalledWith('yearly');
    });

    test('calls onValueChange with monthly when Monthly tab is clicked', async () => {
      cleanup();
      const onValueChange = vi.fn();
      component = render(
        <PricingToggle onValueChange={onValueChange} value="yearly" />,
      );

      const user = userEvent.setup();
      await user.click(component.getByRole('tab', { name: 'Monthly' }));

      expect(onValueChange).toHaveBeenCalledWith('monthly');
    });
  });
});
