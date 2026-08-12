import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';
import { DrawerFooter } from '../DrawerFooter';

describe('DrawerFooter', () => {
  test('renders with its data-slot and merges className', () => {
    const { container } = render(
      <Drawer>
        <DrawerFooter className="custom-drawer-footer">Body</DrawerFooter>
      </Drawer>,
    );
    const el = container.querySelector('[data-slot="drawer-footer"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-drawer-footer');
  });
});
