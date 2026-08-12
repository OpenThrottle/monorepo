import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '../index';

describe('MenubarSeparator', () => {
  test('renders inside an open menubar menu', () => {
    render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSeparator />
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const sep = document.body.querySelector('[role="separator"]');
    expect(sep).toBeInTheDocument();
  });
});
