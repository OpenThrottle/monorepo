import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '../index';
import {
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '../NavigationMenuTrigger';

describe('NavigationMenuTrigger', () => {
  test('renders a trigger button', () => {
    const component = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(
      component.getByRole('button', { name: /Products/ }),
    ).toBeInTheDocument();
  });

  test('navigationMenuTriggerStyle returns class names', () => {
    expect(typeof navigationMenuTriggerStyle()).toBe('string');
  });
});
