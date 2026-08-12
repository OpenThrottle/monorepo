import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Menubar, MenubarContent, MenubarMenu, MenubarTrigger } from '../index';

describe('MenubarContent', () => {
  test('renders inside an open menubar menu', () => {
    render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <div>Menu body</div>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const menu = document.body.querySelector('[role="menu"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveTextContent('Menu body');
  });
});
