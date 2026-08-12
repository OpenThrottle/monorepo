import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';
import { DrawerContent } from '../DrawerContent';

describe('DrawerContent', () => {
  test('renders its content when the drawer is open', () => {
    render(
      <Drawer open={true}>
        <DrawerContent>Panel body</DrawerContent>
      </Drawer>,
    );
    expect(screen.getByText('Panel body')).toBeInTheDocument();
  });
});
