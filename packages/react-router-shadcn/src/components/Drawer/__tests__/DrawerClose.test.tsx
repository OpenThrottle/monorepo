import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';
import { DrawerClose } from '../DrawerClose';
import { DrawerContent } from '../DrawerContent';

describe('DrawerClose', () => {
  test('renders a close button inside the drawer', () => {
    render(
      <Drawer open={true}>
        <DrawerContent>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
