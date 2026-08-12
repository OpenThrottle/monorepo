import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MenubarShortcut } from '../MenubarShortcut';

describe('MenubarShortcut', () => {
  test('renders shortcut text and merges className', () => {
    const { container } = render(
      <MenubarShortcut className="custom-shortcut">⌘M</MenubarShortcut>,
    );
    const el = container.querySelector('span');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('⌘M');
    expect(el).toHaveClass('custom-shortcut');
  });
});
