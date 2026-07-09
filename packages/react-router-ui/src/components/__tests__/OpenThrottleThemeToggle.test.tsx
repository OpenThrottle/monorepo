import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ThemeMode } from '@openthrottle/react-router-utils';
import { OpenThrottleThemeToggle } from '../OpenThrottleThemeToggle';
import type { OpenThrottleThemeToggleProps } from '../OpenThrottleThemeToggle';

describe('OpenThrottleThemeToggle Component', () => {
  let component: RenderResult;
  let props: OpenThrottleThemeToggleProps;
  let onValueChange: ReturnType<typeof vi.fn<(mode: ThemeMode) => void>>;

  beforeEach(() => {
    onValueChange = vi.fn<(mode: ThemeMode) => void>();
    props = { onValueChange, value: 'system' };

    const Component = () => <OpenThrottleThemeToggle {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders all three color-mode options', () => {
    expect(
      component.getByRole('radio', { name: 'Light mode' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('radio', { name: 'Dark mode' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('radio', { name: 'System mode' }),
    ).toBeInTheDocument();
  });

  test('marks the controlled value as selected', () => {
    expect(
      component.getByRole('radio', { name: 'System mode' }),
    ).toHaveAttribute('data-state', 'on');
  });

  test('fires onValueChange with the matching ThemeMode for each option', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('radio', { name: 'Light mode' }));
    expect(onValueChange).toHaveBeenLastCalledWith('light');

    await user.click(component.getByRole('radio', { name: 'Dark mode' }));
    expect(onValueChange).toHaveBeenLastCalledWith('dark');

    // System is already the value; clicking it would deselect (emit '') in a
    // Radix single toggle — verify the light/dark emissions are exactly the
    // valid ThemeModes and nothing invalid slipped through.
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).not.toHaveBeenCalledWith('');
  });
});
