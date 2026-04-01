import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from '../Separator';

describe('Separator', () => {
  it('should render horizontal separator by default', () => {
    const { container } = render(<Separator />);
    const separator = container.firstElementChild;
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveClass('h-[1px]', 'w-full', 'bg-border');
  });

  it('should render vertical separator when orientation is vertical', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const separator = container.firstElementChild;
    expect(separator).toHaveClass('h-full', 'w-[1px]');
  });

  it('should merge custom className', () => {
    const { container } = render(<Separator className="custom-class" />);
    const separator = container.firstElementChild;
    expect(separator).toHaveClass('custom-class');
  });
});
