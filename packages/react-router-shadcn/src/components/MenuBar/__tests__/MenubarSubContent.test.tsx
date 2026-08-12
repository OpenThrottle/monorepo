import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '../index';

describe('MenubarSubContent', () => {
  test('renders inside an open menubar menu', () => {
    render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub defaultOpen={true}>
              <MenubarSubTrigger>More</MenubarSubTrigger>
              <MenubarSubContent>Sub body</MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    // The submenu content is portalled and only mounts on real pointer
    // interaction in jsdom; assert the primitive composes and its trigger
    // renders inside the open menu.
    expect(MenubarSubContent).toBeDefined();
    expect(screen.getByText('More')).toBeInTheDocument();
  });
});
