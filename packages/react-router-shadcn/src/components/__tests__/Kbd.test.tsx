import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd, KbdGroup } from '../Kbd';

describe('Kbd', () => {
  it('should render with default props', () => {
    const { container } = render(<Kbd>Ctrl</Kbd>);
    const kbd = container.querySelector('kbd[data-slot="kbd"]');
    expect(kbd).toBeInTheDocument();
    expect(kbd).toHaveTextContent('Ctrl');
  });

  it('should apply default kbd classes', () => {
    const { container } = render(<Kbd>Enter</Kbd>);
    const kbd = container.querySelector('kbd[data-slot="kbd"]');
    expect(kbd).toHaveClass(
      'pointer-events-none',
      'inline-flex',
      'h-5',
      'w-fit',
      'min-w-5',
      'items-center',
      'justify-center',
      'rounded-sm',
      'bg-muted',
      'font-sans',
      'text-xs',
      'font-medium',
      'text-muted-foreground',
      'select-none',
    );
  });

  it('should merge custom className', () => {
    const { container } = render(<Kbd className="custom-kbd">Shift</Kbd>);
    const kbd = container.querySelector('kbd[data-slot="kbd"]');
    expect(kbd).toHaveClass('custom-kbd');
  });

  it('should forward HTML attributes', () => {
    const { container } = render(<Kbd data-testid="kbd-key">Ctrl</Kbd>);
    const kbd = container.querySelector('kbd[data-slot="kbd"]');
    expect(kbd).toHaveAttribute('data-testid', 'kbd-key');
  });
});

describe('KbdGroup', () => {
  it('should render children', () => {
    const { container } = render(
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>B</Kbd>
      </KbdGroup>,
    );
    const group = container.querySelector('kbd[data-slot="kbd-group"]');
    expect(group).toBeInTheDocument();
    const kbdElements = container.querySelectorAll('kbd[data-slot="kbd"]');
    expect(kbdElements).toHaveLength(2);
    expect(kbdElements[0]).toHaveTextContent('Ctrl');
    expect(kbdElements[1]).toHaveTextContent('B');
  });

  it('should apply default group classes', () => {
    const { container } = render(
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    const group = container.querySelector('kbd[data-slot="kbd-group"]');
    expect(group).toHaveClass('inline-flex', 'items-center', 'gap-1');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <KbdGroup className="custom-group">
        <Kbd>⌘</Kbd>
      </KbdGroup>,
    );
    const group = container.querySelector('kbd[data-slot="kbd-group"]');
    expect(group).toHaveClass('custom-group');
  });
});
