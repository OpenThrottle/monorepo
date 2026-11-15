import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { BreadcrumbPage } from '../BreadcrumbPage';

describe('BreadcrumbPage', () => {
  it('uses aria-current page, visible text, and typography classes', () => {
    const component = render(<BreadcrumbPage>Current section</BreadcrumbPage>);
    const page = component.getByText('Current section');
    expect(page).toHaveAttribute('aria-current', 'page');
    expect(page).not.toHaveAttribute('role');
    expect(page).toHaveClass('font-normal', 'text-foreground');
  });

  it('merges custom className with defaults', () => {
    const component = render(
      <BreadcrumbPage className="truncate">Long label</BreadcrumbPage>,
    );
    const page = component.getByText('Long label');
    expect(page).toHaveClass('font-normal', 'truncate');
  });
});
