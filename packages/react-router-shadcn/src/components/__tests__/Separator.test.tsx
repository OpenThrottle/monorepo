import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from '../Separator';

describe('Separator', () => {
  it('should render horizontal separator by default', () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    expect(separator).toHaveClass('shrink-0', 'bg-border');
    expect(separator?.className).toContain(
      'data-[orientation=horizontal]:h-px',
    );
    expect(separator?.className).toContain(
      'data-[orientation=horizontal]:w-full',
    );
  });

  it('should render vertical separator when orientation is vertical', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
    expect(separator).toHaveClass('shrink-0', 'bg-border');
    expect(separator?.className).toContain(
      'data-[orientation=vertical]:h-full',
    );
    expect(separator?.className).toContain('data-[orientation=vertical]:w-px');
  });

  it('should merge custom className', () => {
    const { container } = render(<Separator className="custom-class" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toHaveClass('custom-class');
  });
});
