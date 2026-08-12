import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from '../index';

describe('MenubarCheckboxItem', () => {
  test('renders inside an open menubar menu', () => {
    render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked={true}>Toggle</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const item = document.body.querySelector('[role="menuitemcheckbox"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Toggle');
  });
});
