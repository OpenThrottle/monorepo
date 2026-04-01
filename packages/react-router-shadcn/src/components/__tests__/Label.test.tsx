import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label } from '../Label';

describe('Label', () => {
  it('should render with default props', () => {
    const { container } = render(<Label>Field label</Label>);
    const label = container.querySelector('label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Field label');
  });

  it('should apply default label classes', () => {
    const { container } = render(<Label>Label</Label>);
    const label = container.querySelector('label');
    expect(label).toHaveClass('text-sm', 'font-medium');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Label className="custom-class">Custom</Label>,
    );
    const label = container.querySelector('label');
    expect(label).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Ref</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('should associate with htmlFor', () => {
    const { container } = render(<Label htmlFor="input-id">Input</Label>);
    const label = container.querySelector('label');
    expect(label).toHaveAttribute('for', 'input-id');
  });
});
