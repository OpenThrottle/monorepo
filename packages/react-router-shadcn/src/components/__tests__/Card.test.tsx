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
    const card = container.querySelector('div');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Card content');
  });

  it('should apply default card classes', () => {
    const { container } = render(<Card>Card</Card>);
    const card = container.querySelector('div');
    expect(card).toHaveClass(
      'bg-card',
      'border',
      'rounded-lg',
      'transition-colors',
      'ui-border',
      'hover:border-color-border-dark',
    );
  });

  it('should merge custom className', () => {
    const { container } = render(<Card className="custom-class">Card</Card>);
    const card = container.querySelector('div');
    expect(card).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Card</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should forward HTML div attributes', () => {
    const { container } = render(
      <Card data-testid="test-card" id="card-1">
        Card
      </Card>,
    );
    const card = container.querySelector('div');
    expect(card).toHaveAttribute('data-testid', 'test-card');
    expect(card).toHaveAttribute('id', 'card-1');
  });
});

describe('CardHeader', () => {
  it('should render with default props', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    const header = container.querySelector('div');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent('Header');
  });

  it('should apply default header classes', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    const header = container.querySelector('div');
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardHeader className="custom-header">Header</CardHeader>,
    );
    const header = container.querySelector('div');
    expect(header).toHaveClass('custom-header');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardHeader ref={ref}>Header</CardHeader>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardTitle', () => {
  it('should render with default props', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    const title = container.querySelector('div');
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Title');
  });

  it('should apply default title classes', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    const title = container.querySelector('div');
    expect(title).toHaveClass(
      'text-2xl',
      'font-semibold',
      'leading-none',
      'tracking-tight',
    );
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardTitle className="custom-title">Title</CardTitle>,
    );
    const title = container.querySelector('div');
    expect(title).toHaveClass('custom-title');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardTitle ref={ref}>Title</CardTitle>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardDescription', () => {
  it('should render with default props', () => {
    const { container } = render(
      <CardDescription>Description</CardDescription>,
    );
    const description = container.querySelector('div');
    expect(description).toBeInTheDocument();
    expect(description).toHaveTextContent('Description');
  });

  it('should apply default description classes', () => {
    const { container } = render(
      <CardDescription>Description</CardDescription>,
    );
    const description = container.querySelector('div');
    expect(description).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardDescription className="custom-desc">Description</CardDescription>,
    );
    const description = container.querySelector('div');
    expect(description).toHaveClass('custom-desc');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardDescription ref={ref}>Description</CardDescription>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardContent', () => {
  it('should render with default props', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    const content = container.querySelector('div');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Content');
  });

  it('should apply default content classes', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    const content = container.querySelector('div');
    expect(content).toHaveClass('p-6', 'pt-0');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardContent className="custom-content">Content</CardContent>,
    );
    const content = container.querySelector('div');
    expect(content).toHaveClass('custom-content');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardContent ref={ref}>Content</CardContent>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardFooter', () => {
  it('should render with default props', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.querySelector('div');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent('Footer');
  });

  it('should apply default footer classes', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.querySelector('div');
    expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <CardFooter className="custom-footer">Footer</CardFooter>,
    );
    const footer = container.querySelector('div');
    expect(footer).toHaveClass('custom-footer');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardFooter ref={ref}>Footer</CardFooter>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
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

    expect(
      container.querySelector('[class*="rounded-lg"]'),
    ).toBeInTheDocument();
    expect(container.textContent).toContain('Card Title');
    expect(container.textContent).toContain('Card Description');
    expect(container.textContent).toContain('Card Content');
    expect(container.textContent).toContain('Card Footer');
  });
});
