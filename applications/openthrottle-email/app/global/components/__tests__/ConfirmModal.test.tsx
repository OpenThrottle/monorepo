import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { ConfirmModal } from '../ConfirmModal';

describe('ConfirmModal Component', () => {
  test('when open, renders title and description', () => {
    const Component = () => (
      <ConfirmModal
        confirmLabel="Delete"
        description="This action cannot be undone."
        destructive={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={true}
        title="Delete item?"
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
    expect(
      screen.getByText('This action cannot be undone.'),
    ).toBeInTheDocument();
  });

  test('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <ConfirmModal
        confirmLabel="OK"
        description="Description"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open={true}
        title="Confirm"
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <ConfirmModal
        confirmLabel="OK"
        description="Description"
        onCancel={onCancel}
        onConfirm={vi.fn()}
        open={true}
        title="Confirm"
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
