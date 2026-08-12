import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';
import { DrawerDescription } from '../DrawerDescription';
import { DrawerHeader } from '../DrawerHeader';

describe('DrawerDescription', () => {
  test('renders the drawer description', () => {
    const { container } = render(
      <Drawer>
        <DrawerHeader>
          <DrawerDescription>Panel description</DrawerDescription>
        </DrawerHeader>
      </Drawer>,
    );
    const desc = container.querySelector('[data-slot="drawer-description"]');
    expect(desc).toBeInTheDocument();
    expect(desc).toHaveTextContent('Panel description');
  });
});
