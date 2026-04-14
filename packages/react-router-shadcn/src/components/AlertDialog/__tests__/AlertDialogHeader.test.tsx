import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertDialogHeader } from '../AlertDialogHeader';

describe('AlertDialogHeader', () => {
  it('renders a flex column with typography alignment classes and merged className', () => {
    const { container } = render(
      <AlertDialogHeader className="header-extra">
        <span>Header content</span>
      </AlertDialogHeader>,
    );

    const header = container.firstElementChild;
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('header-extra');
    expect(header).toHaveClass(
      'flex',
      'flex-col',
      'space-y-2',
      'text-center',
      'sm:text-left',
    );
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });
});
