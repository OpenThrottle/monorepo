import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '../index';

describe('MenubarItem', () => {
  test('renders inside an open menubar menu', () => {
    const component = render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Action</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    // The Menubar trigger also carries role="menuitem", so assert by text.
    const item = component.getByText('Action');
    expect(item).toBeInTheDocument();
    expect(item).toHaveAttribute('role', 'menuitem');
  });
});
