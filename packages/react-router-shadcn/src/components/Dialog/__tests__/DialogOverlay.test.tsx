import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Dialog } from '../Dialog';
import { DialogOverlay } from '../DialogOverlay';

describe('DialogOverlay', () => {
  test('renders the overlay when the dialog is open', () => {
    render(
      <Dialog open={true}>
        <DialogOverlay className="custom-overlay" />
      </Dialog>,
    );
    const overlay = document.body.querySelector('[data-overlay="true"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('custom-overlay');
  });
});
