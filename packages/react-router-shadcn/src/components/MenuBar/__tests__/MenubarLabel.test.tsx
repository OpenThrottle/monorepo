import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarLabel,
  MenubarMenu,
  MenubarTrigger,
} from '../index';

describe('MenubarLabel', () => {
  test('renders inside an open menubar menu', () => {
    render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarLabel>Section</MenubarLabel>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    expect(screen.getByText('Section')).toBeInTheDocument();
  });
});
