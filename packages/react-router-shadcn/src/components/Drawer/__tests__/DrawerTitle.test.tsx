import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';
import { DrawerHeader } from '../DrawerHeader';
import { DrawerTitle } from '../DrawerTitle';

describe('DrawerTitle', () => {
  test('renders the drawer title', () => {
    const { container } = render(
      <Drawer>
        <DrawerHeader>
          <DrawerTitle>Panel title</DrawerTitle>
        </DrawerHeader>
      </Drawer>,
    );
    const title = container.querySelector('[data-slot="drawer-title"]');
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Panel title');
  });
});
