import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';

import type { PlanScheduleConfirmDialogProps } from '../PlanScheduleConfirmDialog';
import { PlanScheduleConfirmDialog } from '../PlanScheduleConfirmDialog';

describe('PlanScheduleConfirmDialog Component', () => {
  let component: RenderResult;
  let props: PlanScheduleConfirmDialogProps;

  const renderDialog = (
    overrides: Partial<PlanScheduleConfirmDialogProps> = {},
  ): void => {
    component?.unmount();
    props = { ...props, ...overrides };

    const Component = (): React.ReactElement => {
      return <PlanScheduleConfirmDialog {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      confirmLabel: 'Do it',
      description: 'Because.',
      isPending: false,
      onConfirm: vi.fn(),
      onOpenChange: vi.fn(),
      open: true,
      title: 'Are you sure?',
    };

    renderDialog();
  });

  test('names the question and describes the consequence', () => {
    const dialog = component.getByRole('alertdialog');

    expect(dialog).toHaveAccessibleName('Are you sure?');
    expect(dialog).toHaveAccessibleDescription('Because.');
  });

  test('renders nothing while closed', () => {
    renderDialog({ open: false });

    expect(component.queryByRole('alertdialog')).toBeNull();
  });

  test('confirming calls onConfirm and keeping asks to close', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Do it' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);

    await user.click(
      component.getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.keepLabel,
      }),
    );
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  test('locks both buttons while pending', () => {
    renderDialog({ isPending: true });

    expect(
      component.getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.pendingLabel,
      }),
    ).toBeDisabled();
    expect(
      component.getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.keepLabel,
      }),
    ).toBeDisabled();
  });
});
