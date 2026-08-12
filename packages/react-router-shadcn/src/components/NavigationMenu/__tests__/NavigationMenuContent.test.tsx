import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../index';

describe('NavigationMenuContent', () => {
  test('renders content for the active menu item', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>Product list</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(screen.getByText('Product list')).toBeInTheDocument();
  });
});
