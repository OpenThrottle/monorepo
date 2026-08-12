import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ContextMenuShortcut } from '../ContextMenuShortcut';

describe('ContextMenuShortcut', () => {
  test('renders shortcut text and merges className', () => {
    const { container } = render(
      <ContextMenuShortcut className="custom-shortcut">⌘C</ContextMenuShortcut>,
    );
    const el = container.querySelector('span');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('⌘C');
    expect(el).toHaveClass('custom-shortcut');
  });
});
