import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertDialogFooter } from '../AlertDialogFooter';

describe('AlertDialogFooter', () => {
  it('renders a flex container with layout classes and merged className', () => {
    const { container } = render(
      <AlertDialogFooter className="footer-extra">
        <span>Actions</span>
      </AlertDialogFooter>,
    );

    const footer = container.firstElementChild;
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('footer-extra');
    expect(footer).toHaveClass(
      'flex',
      'flex-col-reverse',
      'sm:flex-row',
      'sm:justify-end',
      'sm:space-x-2',
    );
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
