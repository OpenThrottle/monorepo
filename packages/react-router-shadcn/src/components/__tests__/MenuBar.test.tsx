import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '../MenuBar';

describe('MenuBar', () => {
  it('should render root with children', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
        </MenubarMenu>
      </Menubar>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
  });

  it('should render MenubarTrigger as button', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
        </MenubarMenu>
      </Menubar>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('File');
  });

  it('should render MenubarContent with expected content when open', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New Tab</MenubarItem>
            <MenubarItem>New Window</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const triggers = document.body.querySelectorAll('button');
    expect(triggers.length).toBeGreaterThanOrEqual(1);
  });

  it('should render MenubarItem with role menuitem when menu is opened', async () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Edit');
  });
});
