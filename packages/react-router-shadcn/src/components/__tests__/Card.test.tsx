import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../Card';

describe('Card', () => {
  it('should render with default props', () => {
    const { container } = render(<Card>Card content</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Card content');
  });

  it('should apply default card classes', () => {
    const { container } = render(<Card>Card</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveClass(
      'flex',
      'flex-col',
      'gap-6',
      'rounded-xl',
      'border',
      'bg-card',
      'py-6',
      'text-card-foreground',
      'shadow-sm',
    );
  });

  it('should merge custom className', () => {
    const { container } = render(<Card className="custom-class">Card</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveClass('custom-class');
  });

  it('should forward HTML div attributes', () => {
    const { container } = render(
      <Card data-testid="test-card" id="card-1">
        Card
      </Card>,
    );
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveAttribute('data-testid', 'test-card');
    expect(card).toHaveAttribute('id', 'card-1');
  });
});

describe('CardHeader', () => {
  it('should render with default props', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    const header = container.querySelector('[data-slot="card-header"]');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent('Header');
  });

  it('should apply default header classes', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    const header = container.querySelector('[data-slot="card-header"]');
    expect(header).toHaveClass(
      '@container/card-header',
      'grid',
      'auto-rows-min',
      'items-start',
      'gap-2',
      'px-6',
    );
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardHeader className="custom-header">Header</CardHeader>,
    );
    const header = container.querySelector('[data-slot="card-header"]');
    expect(header).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('should render with default props', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    const title = container.querySelector('[data-slot="card-title"]');
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Title');
  });

  it('should apply default title classes', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    const title = container.querySelector('[data-slot="card-title"]');
    expect(title).toHaveClass('leading-none', 'font-semibold');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardTitle className="custom-title">Title</CardTitle>,
    );
    const title = container.querySelector('[data-slot="card-title"]');
    expect(title).toHaveClass('custom-title');
  });
});

describe('CardDescription', () => {
  it('should render with default props', () => {
    const { container } = render(
      <CardDescription>Description</CardDescription>,
    );
    const description = container.querySelector(
      '[data-slot="card-description"]',
    );
    expect(description).toBeInTheDocument();
    expect(description).toHaveTextContent('Description');
  });

  it('should apply default description classes', () => {
    const { container } = render(
      <CardDescription>Description</CardDescription>,
    );
    const description = container.querySelector(
      '[data-slot="card-description"]',
    );
    expect(description).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardDescription className="custom-desc">Description</CardDescription>,
    );
    const description = container.querySelector(
      '[data-slot="card-description"]',
    );
    expect(description).toHaveClass('custom-desc');
  });
});

describe('CardContent', () => {
  it('should render with default props', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    const content = container.querySelector('[data-slot="card-content"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Content');
  });

  it('should apply default content classes', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    const content = container.querySelector('[data-slot="card-content"]');
    expect(content).toHaveClass('px-6');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardContent className="custom-content">Content</CardContent>,
    );
    const content = container.querySelector('[data-slot="card-content"]');
    expect(content).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('should render with default props', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.querySelector('[data-slot="card-footer"]');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent('Footer');
  });

  it('should apply default footer classes', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.querySelector('[data-slot="card-footer"]');
    expect(footer).toHaveClass('flex', 'items-center', 'px-6');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardFooter className="custom-footer">Footer</CardFooter>,
    );
    const footer = container.querySelector('[data-slot="card-footer"]');
    expect(footer).toHaveClass('custom-footer');
  });
});

describe('Card composition', () => {
  it('should render complete card structure', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>,
    );

    expect(container.querySelector('[data-slot="card"]')).toHaveClass(
      'rounded-xl',
    );
    expect(container.textContent).toContain('Card Title');
    expect(container.textContent).toContain('Card Description');
    expect(container.textContent).toContain('Card Content');
    expect(container.textContent).toContain('Card Footer');
  });
});
