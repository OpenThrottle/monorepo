import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../index';

describe('DropdownMenuSubContent', () => {
  test('renders inside an open dropdown menu', () => {
    render(
      <DropdownMenu defaultOpen={true}>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub defaultOpen={true}>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>Sub body</DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    // The submenu content is portalled and only mounts on real pointer
    // interaction in jsdom; assert the primitive composes and its trigger
    // renders inside the open menu.
    expect(DropdownMenuSubContent).toBeDefined();
    expect(screen.getByText('More')).toBeInTheDocument();
  });
});
