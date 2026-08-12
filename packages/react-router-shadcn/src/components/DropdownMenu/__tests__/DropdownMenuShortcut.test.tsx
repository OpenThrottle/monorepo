import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DropdownMenuShortcut } from '../DropdownMenuShortcut';

describe('DropdownMenuShortcut', () => {
  test('renders shortcut text and merges className', () => {
    const { container } = render(
      <DropdownMenuShortcut className="custom-shortcut">
        ⌘D
      </DropdownMenuShortcut>,
    );
    const el = container.querySelector('span');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('⌘D');
    expect(el).toHaveClass('custom-shortcut');
  });
});
