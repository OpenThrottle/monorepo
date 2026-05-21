import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with default props', () => {
    const { container } = render(<Button>Click me</Button>);
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('should apply default variant and size classes', () => {
    const { container } = render(<Button>Default</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-primary', 'h-9', 'px-4');
  });

  describe('variants', () => {
    it('should apply default variant', () => {
      const { container } = render(<Button variant="default">Default</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should apply destructive variant', () => {
      const { container } = render(
        <Button variant="destructive">Destructive</Button>,
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-destructive', 'text-white');
    });

    it('should apply outline variant', () => {
      const { container } = render(<Button variant="outline">Outline</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('border', 'bg-background', 'shadow-xs');
    });

    it('should apply secondary variant', () => {
      const { container } = render(
        <Button variant="secondary">Secondary</Button>,
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('should apply ghost variant', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('hover:bg-accent');
    });

    it('should apply link variant', () => {
      const { container } = render(<Button variant="link">Link</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('text-primary', 'underline-offset-4');
    });
  });

  describe('sizes', () => {
    it('should apply default size', () => {
      const { container } = render(<Button size="default">Default</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('h-9', 'px-4');
    });

    it('should apply sm size', () => {
      const { container } = render(<Button size="sm">Small</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('h-8', 'px-3');
    });

    it('should apply lg size', () => {
      const { container } = render(<Button size="lg">Large</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('h-10', 'px-6');
    });

    it('should apply icon size', () => {
      const { container } = render(<Button size="icon">Icon</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('size-9');
    });
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Button className="custom-class">Custom</Button>,
    );
    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('should forward HTML button attributes', () => {
    const { container } = render(
      <Button data-testid="test-button" disabled={true} type="submit">
        Submit
      </Button>,
    );
    const button = container.querySelector('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-testid', 'test-button');
  });

  it('should render as child when asChild is true', () => {
    const { container } = render(
      <Button asChild={true}>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveTextContent('Link Button');
  });
});
