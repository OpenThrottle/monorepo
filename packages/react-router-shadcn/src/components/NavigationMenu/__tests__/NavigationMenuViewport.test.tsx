import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '../index';

describe('NavigationMenuViewport', () => {
  test('renders within a navigation menu without error', () => {
    expect(NavigationMenuViewport).toBeDefined();
    render(
      <NavigationMenu defaultValue="a">
        <NavigationMenuList>
          <NavigationMenuItem value="a">
            <NavigationMenuTrigger>Tab</NavigationMenuTrigger>
            <NavigationMenuContent>Body</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuViewport />
      </NavigationMenu>,
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
