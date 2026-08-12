import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../index';

describe('DropdownMenuRadioItem', () => {
  test('renders inside an open dropdown menu', () => {
    render(
      <DropdownMenu defaultOpen={true}>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = document.body.querySelector('[role="menuitemradio"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Option A');
  });
});
