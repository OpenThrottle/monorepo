import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BreadcrumbPage } from '../BreadcrumbPage';

describe('BreadcrumbPage', () => {
  it('uses aria-current page, visible text, and typography classes', () => {
    render(<BreadcrumbPage>Current section</BreadcrumbPage>);
    const page = screen.getByText('Current section');
    expect(page).toHaveAttribute('aria-current', 'page');
    expect(page).not.toHaveAttribute('role');
    expect(page).toHaveClass('font-normal', 'text-foreground');
  });

  it('merges custom className with defaults', () => {
    render(<BreadcrumbPage className="truncate">Long label</BreadcrumbPage>);
    const page = screen.getByText('Long label');
    expect(page).toHaveClass('font-normal', 'truncate');
  });
});
