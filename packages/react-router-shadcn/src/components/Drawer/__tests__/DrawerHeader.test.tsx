import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';
import { DrawerHeader } from '../DrawerHeader';

describe('DrawerHeader', () => {
  test('renders with its data-slot and merges className', () => {
    const { container } = render(
      <Drawer>
        <DrawerHeader className="custom-drawer-header">Body</DrawerHeader>
      </Drawer>,
    );
    const el = container.querySelector('[data-slot="drawer-header"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-drawer-header');
  });
});
