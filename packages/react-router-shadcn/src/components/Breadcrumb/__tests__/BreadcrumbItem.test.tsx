import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { BreadcrumbItem } from '../BreadcrumbItem';

describe('BreadcrumbItem', () => {
  it('renders a list item with inline-flex gap layout classes', () => {
    const component = render(<BreadcrumbItem>Segment</BreadcrumbItem>);
    const item = component.getByRole('listitem');
    expect(item).toHaveClass('inline-flex', 'items-center', 'gap-1.5');
    expect(item).toHaveTextContent('Segment');
  });

  it('merges custom className with defaults', () => {
    const component = render(
      <BreadcrumbItem className="min-w-0 shrink">Crumb</BreadcrumbItem>,
    );
    const item = component.getByRole('listitem');
    expect(item).toHaveClass('inline-flex', 'min-w-0', 'shrink');
  });
});
