import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalModal } from '../GlobalModal';

describe('GlobalModal Component', () => {
  test('does not show dialog when URL param is absent', () => {
    const Component = () => (
      <GlobalModal param="modal" value="open">
        <span>modal-content</span>
      </GlobalModal>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
