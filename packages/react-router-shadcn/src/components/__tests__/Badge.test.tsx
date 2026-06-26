import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('should render with default props', () => {
    const { container } = render(<Badge>Label</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Label');
  });

  it.skip('should apply default variant classes', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  describe.skip('variants', () => {
    it('should apply destructive variant', () => {
      const { container } = render(
        <Badge variant="destructive">Destructive</Badge>,
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-destructive', 'text-white');
    });

    it('should apply outline variant', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-foreground');
    });

    it('should apply secondary variant', () => {
      const { container } = render(
        <Badge variant="secondary">Secondary</Badge>,
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Badge className="custom-class">Custom</Badge>,
    );
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('custom-class');
  });

  it('should let a conflicting className override the variant utility', () => {
    // Regression: cn()/tailwind-merge must resolve a conflicting background
    // utility in favour of the caller's className, dropping the variant's
    // own bg-primary. Guards against cva-placement/merge-order regressions.
    const { container } = render(
      <Badge className="bg-red-500" variant="default">
        Override
      </Badge>,
    );
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-red-500');
    expect(badge).not.toHaveClass('bg-primary');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>Ref</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
