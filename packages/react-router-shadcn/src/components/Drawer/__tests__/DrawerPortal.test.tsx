import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { Drawer } from '../Drawer';
import { DrawerPortal } from '../DrawerPortal';

describe('DrawerPortal', () => {
  test('portals its children when the drawer is open', () => {
    const component = render(
      <Drawer open={true}>
        <DrawerPortal>
          <div>Portalled</div>
        </DrawerPortal>
      </Drawer>,
    );
    expect(component.getByText('Portalled')).toBeInTheDocument();
  });
});
