import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../DropdownMenu';

describe('DropdownMenu', () => {
  it('should render root with children', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      </DropdownMenu>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
  });

  it('should render DropdownMenuTrigger as button', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      </DropdownMenu>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Open');
  });

  it('should render DropdownMenuContent with expected classes when open', () => {
    render(
      <DropdownMenu defaultOpen={true}>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>Menu</DropdownMenuContent>
      </DropdownMenu>,
    );
    const content = document.body.querySelector('[role="menu"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Menu');
  });

  it('should render DropdownMenuItem with role menuitem when open', () => {
    render(
      <DropdownMenu defaultOpen={true}>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = document.body.querySelector('[role="menuitem"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Item');
  });
});
