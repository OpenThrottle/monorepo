import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '../index';
import {
  navigationMenuTriggerStyle,
  NavigationMenuTrigger,
} from '../NavigationMenuTrigger';

describe('NavigationMenuTrigger', () => {
  test('renders a trigger button', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(
      screen.getByRole('button', { name: /Products/ }),
    ).toBeInTheDocument();
  });

  test('navigationMenuTriggerStyle returns class names', () => {
    expect(typeof navigationMenuTriggerStyle()).toBe('string');
  });
});
