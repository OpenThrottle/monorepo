import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BreadcrumbLink } from '../BreadcrumbLink';

describe('BreadcrumbLink', () => {
  it('renders an anchor with href, visible text, and transition hover classes', () => {
    render(<BreadcrumbLink href="/docs">Documentation</BreadcrumbLink>);
    const link = screen.getByRole('link', { name: 'Documentation' });
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).toHaveClass('transition-colors', 'hover:text-foreground');
  });

  it('merges custom className with defaults', () => {
    render(
      <BreadcrumbLink className="underline-offset-4" href="/">
        Home
      </BreadcrumbLink>,
    );
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveClass('transition-colors', 'underline-offset-4');
  });

  it('merges default classes onto the child element when asChild is true', () => {
    const { container } = render(
      <BreadcrumbLink asChild={true}>
        <a href="/nested">Nested</a>
      </BreadcrumbLink>,
    );
    const anchor = container.querySelector('a');
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute('href', '/nested');
    expect(anchor).toHaveTextContent('Nested');
    expect(anchor).toHaveClass('transition-colors', 'hover:text-foreground');
  });
});
