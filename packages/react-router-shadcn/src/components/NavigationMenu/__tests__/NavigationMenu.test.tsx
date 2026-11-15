import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '../index';

describe('NavigationMenu', () => {
  test('renders the navigation landmark with its items', () => {
    const component = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/">Home</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(component.getByRole('navigation')).toBeInTheDocument();
    expect(component.getByText('Home')).toBeInTheDocument();
  });
});
