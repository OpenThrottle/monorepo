import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';
import { DrawerOverlay } from '../DrawerOverlay';
import { DrawerPortal } from '../DrawerPortal';

describe('DrawerOverlay', () => {
  test('renders the overlay when the drawer is open', () => {
    render(
      <Drawer open={true}>
        <DrawerPortal>
          <DrawerOverlay />
        </DrawerPortal>
      </Drawer>,
    );
    expect(
      document.body.querySelector('[data-slot="drawer-overlay"]'),
    ).toBeInTheDocument();
  });
});
