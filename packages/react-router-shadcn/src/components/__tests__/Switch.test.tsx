import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Switch } from '../Switch';

describe('Switch', () => {
  it('should render with default props', () => {
    const { container } = render(<Switch />);
    const root = container.querySelector('[data-state]');
    expect(root).toBeInTheDocument();
  });

  it('should have unchecked state by default', () => {
    const { container } = render(<Switch />);
    const root = container.querySelector('[data-state="unchecked"]');
    expect(root).toBeInTheDocument();
  });

  it('should show checked state when controlled with checked', () => {
    const { container } = render(<Switch checked={true} />);
    const root = container.querySelector('[data-state="checked"]');
    expect(root).toBeInTheDocument();
  });

  it('should merge custom className on root', () => {
    const { container } = render(<Switch className="custom-class" />);
    const root = container.firstChild;
    expect(root).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Switch ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('should be disabled when disabled prop is true', () => {
    const { container } = render(<Switch disabled={true} />);
    const root = container.querySelector('button');
    expect(root).toBeDisabled();
  });
});
