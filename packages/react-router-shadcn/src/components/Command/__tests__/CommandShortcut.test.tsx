import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CommandShortcut } from '../CommandShortcut';

describe('CommandShortcut', () => {
  test('renders shortcut text and merges className', () => {
    const { container } = render(
      <CommandShortcut className="custom-shortcut">⌘K</CommandShortcut>,
    );
    const el = container.querySelector('.custom-shortcut');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('⌘K');
  });
});
