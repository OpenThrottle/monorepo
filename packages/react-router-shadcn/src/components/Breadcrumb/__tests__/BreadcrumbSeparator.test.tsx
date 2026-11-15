import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { BreadcrumbSeparator } from '../BreadcrumbSeparator';

describe('BreadcrumbSeparator', () => {
  it('renders a presentation list item with aria-hidden and svg sizing class', () => {
    const component = render(<BreadcrumbSeparator />);
    const separator = component.container.querySelector('li');
    expect(separator).not.toBeNull();
    expect(separator).toHaveAttribute('aria-hidden', 'true');
    expect(separator).toHaveAttribute('role', 'presentation');
    expect(separator).toHaveClass('[&>svg]:size-3.5');
  });

  it('renders the default ChevronRight icon when children are omitted', () => {
    const component = render(<BreadcrumbSeparator />);
    const svg = component.container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveClass('lucide-chevron-right');
  });

  it('renders custom children instead of the default icon', () => {
    const component = render(<BreadcrumbSeparator>/</BreadcrumbSeparator>);
    expect(component.getByText('/')).toBeInTheDocument();
    expect(document.querySelector('.lucide-chevron-right')).toBeNull();
  });

  it('merges custom className with defaults', () => {
    const component = render(
      <BreadcrumbSeparator className="text-muted-foreground" />,
    );
    const separator = component.container.querySelector('li');
    expect(separator).toHaveClass('[&>svg]:size-3.5', 'text-muted-foreground');
  });
});
