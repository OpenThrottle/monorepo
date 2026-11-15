import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { AlertDialogFooter } from '../AlertDialogFooter';

describe('AlertDialogFooter', () => {
  it('renders a flex container with layout classes and merged className', () => {
    const component = render(
      <AlertDialogFooter className="footer-extra">
        <span>Actions</span>
      </AlertDialogFooter>,
    );

    const footer = component.container.firstElementChild;
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('footer-extra');
    expect(footer).toHaveClass(
      'flex',
      'flex-col-reverse',
      'sm:flex-row',
      'sm:justify-end',
      'sm:space-x-2',
    );
    expect(component.getByText('Actions')).toBeInTheDocument();
  });
});
