import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from '../Progress';

describe('Progress', () => {
  it('should render with default props', () => {
    const { container } = render(<Progress value={33} />);
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress).toBeInTheDocument();
  });

  it('should apply track and indicator classes', () => {
    const { container } = render(<Progress value={50} />);
    const root = container.querySelector('[data-slot="progress"]');
    expect(root).toHaveClass(
      'relative',
      'h-2',
      'w-full',
      'overflow-hidden',
      'rounded-full',
      'bg-primary/20',
    );
    const indicator = root?.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass(
      'h-full',
      'w-full',
      'flex-1',
      'bg-primary',
      'transition-all',
    );
  });

  it('should respect max prop', () => {
    const { container } = render(<Progress max={50} value={25} />);
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress).toHaveAttribute('aria-valuemax', '50');
    expect(progress).toHaveAttribute('aria-valuenow', '25');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Progress className="custom-class" value={10} />,
    );
    const progress = container.querySelector('[data-slot="progress"]');
    expect(progress).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={0} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
