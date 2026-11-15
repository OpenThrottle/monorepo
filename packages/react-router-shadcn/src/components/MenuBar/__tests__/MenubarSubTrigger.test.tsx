import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarSub,
  MenubarSubTrigger,
  MenubarTrigger,
} from '../index';

describe('MenubarSubTrigger', () => {
  test('renders inside an open menubar menu', () => {
    const component = render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub defaultOpen={true}>
              <MenubarSubTrigger>More</MenubarSubTrigger>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    expect(component.getByText('More')).toBeInTheDocument();
  });
});
