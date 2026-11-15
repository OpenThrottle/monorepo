import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { Menubar, MenubarMenu, MenubarTrigger } from '../index';

describe('Menubar', () => {
  test('renders the menubar with a trigger', () => {
    const component = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
        </MenubarMenu>
      </Menubar>,
    );
    expect(component.getByRole('menubar')).toBeInTheDocument();
    expect(component.getByText('File')).toBeInTheDocument();
  });
});
