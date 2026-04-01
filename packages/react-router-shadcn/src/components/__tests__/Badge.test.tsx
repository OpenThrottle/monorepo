import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('should render with default props', () => {
    const { container } = render(<Badge>Label</Badge>);
    const badge = container.querySelector('div');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Label');
  });

  it('should apply default variant classes', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('div');
    expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  describe('variants', () => {
    it('should apply destructive variant', () => {
      const { container } = render(
        <Badge variant="destructive">Destructive</Badge>,
      );
      const badge = container.querySelector('div');
      expect(badge).toHaveClass(
        'bg-destructive',
        'text-destructive-foreground',
      );
    });

    it('should apply outline variant', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('text-foreground');
    });

    it('should apply secondary variant', () => {
      const { container } = render(
        <Badge variant="secondary">Secondary</Badge>,
      );
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Badge className="custom-class">Custom</Badge>,
    );
    const badge = container.querySelector('div');
    expect(badge).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Badge ref={ref}>Ref</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
