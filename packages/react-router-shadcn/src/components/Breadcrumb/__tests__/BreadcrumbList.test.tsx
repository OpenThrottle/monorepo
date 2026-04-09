import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BreadcrumbList } from '../BreadcrumbList';

describe('BreadcrumbList', () => {
  it('renders an ordered list with layout and typography classes', () => {
    render(<BreadcrumbList />);
    const list = screen.getByRole('list');
    expect(list).toHaveClass(
      'flex',
      'flex-wrap',
      'items-center',
      'gap-1.5',
      'break-words',
      'text-sm',
      'text-muted-foreground',
    );
  });

  it('merges custom className with defaults', () => {
    render(<BreadcrumbList className="px-1 font-medium" />);
    const list = screen.getByRole('list');
    expect(list).toHaveClass('flex', 'px-1', 'font-medium');
  });
});
