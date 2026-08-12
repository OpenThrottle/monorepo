import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';
import { DrawerPortal } from '../DrawerPortal';

describe('DrawerPortal', () => {
  test('portals its children when the drawer is open', () => {
    render(
      <Drawer open={true}>
        <DrawerPortal>
          <div>Portalled</div>
        </DrawerPortal>
      </Drawer>,
    );
    expect(screen.getByText('Portalled')).toBeInTheDocument();
  });
});
