import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../index';

describe('DropdownMenuContent', () => {
  test('renders inside an open dropdown menu', () => {
    render(
      <DropdownMenu defaultOpen={true}>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <div>Menu body</div>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const menu = document.body.querySelector('[role="menu"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveTextContent('Menu body');
  });
});
