import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ScrollArea } from '../ScrollArea';
import { ScrollBar } from '../ScrollBar';

describe('ScrollBar', () => {
  test('is a defined forwardRef primitive', () => {
    expect(ScrollBar).toBeDefined();
  });

  test('renders inside a ScrollArea without error', () => {
    const { container } = render(
      <ScrollArea>
        <div>Scrollable</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>,
    );
    expect(
      container.querySelector('[data-slot="scroll-area"]'),
    ).toBeInTheDocument();
    expect(container.textContent).toContain('Scrollable');
  });
});
