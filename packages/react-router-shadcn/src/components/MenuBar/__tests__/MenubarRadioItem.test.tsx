import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarTrigger,
} from '../index';

describe('MenubarRadioItem', () => {
  test('renders inside an open menubar menu', () => {
    render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value="a">
              <MenubarRadioItem value="a">Option A</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const item = document.body.querySelector('[role="menuitemradio"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Option A');
  });
});
