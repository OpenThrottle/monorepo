import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { Drawer } from '../Drawer';
import { DrawerContent } from '../DrawerContent';

describe('DrawerContent', () => {
  test('renders its content when the drawer is open', () => {
    const component = render(
      <Drawer open={true}>
        <DrawerContent>Panel body</DrawerContent>
      </Drawer>,
    );
    expect(component.getByText('Panel body')).toBeInTheDocument();
  });
});
