import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../index';

describe('DropdownMenuSubTrigger', () => {
  test('renders inside an open dropdown menu', () => {
    render(
      <DropdownMenu defaultOpen={true}>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub defaultOpen={true}>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByText('More')).toBeInTheDocument();
  });
});
