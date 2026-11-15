import { render } from '@testing-library/react';
import * as React from 'react';
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
    const component = render(
      <NavigationMenu defaultValue="a">
        <NavigationMenuList>
          <NavigationMenuItem value="a">
            <NavigationMenuTrigger>Tab</NavigationMenuTrigger>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(component.getByRole('navigation')).toBeInTheDocument();
  });
});
