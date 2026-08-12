import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  NavigationMenu,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../index';

describe('NavigationMenuIndicator', () => {
  test('renders within a navigation menu without error', () => {
    expect(NavigationMenuIndicator).toBeDefined();
    render(
      <NavigationMenu defaultValue="a">
        <NavigationMenuList>
          <NavigationMenuItem value="a">
            <NavigationMenuTrigger>Tab</NavigationMenuTrigger>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
