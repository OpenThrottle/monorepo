import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Menubar, MenubarMenu, MenubarTrigger } from '../index';

describe('Menubar', () => {
  test('renders the menubar with a trigger', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
        </MenubarMenu>
      </Menubar>,
    );
    expect(screen.getByRole('menubar')).toBeInTheDocument();
    expect(screen.getByText('File')).toBeInTheDocument();
  });
});
