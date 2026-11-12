import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';
import { formatPlanScheduledFor } from '~/routing/plans/utils/formatPlanScheduledFor';

import type { PlanRunDialogConfirmProps } from '../PlanRunDialogConfirm';
import { PlanRunDialogConfirm } from '../PlanRunDialogConfirm';

const SCHEDULED_AT = '2026-11-08T17:00:00.000Z';

describe('PlanRunDialogConfirm Component', () => {
  let component: RenderResult;
  let props: PlanRunDialogConfirmProps;

  const renderConfirm = (
    overrides: Partial<PlanRunDialogConfirmProps> = {},
  ): void => {
    component?.unmount();
    props = { ...props, ...overrides };

    const Component = (): React.ReactElement => {
      return <PlanRunDialogConfirm {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      mode: 'run',
      onConfirm: vi.fn(),
      onOpenChange: vi.fn(),
      open: true,
      scheduledFor: SCHEDULED_AT,
    };

    renderConfirm();
  });

  test('on the Run tab it asks to unschedule and run now, naming the time', () => {
    const localTime = formatPlanScheduledFor(SCHEDULED_AT);

    expect(component.getByRole('alertdialog')).toHaveAccessibleName(
      PLAN_SCHEDULE_CONFIRM_COPY.runNowTitle(localTime),
    );
    expect(
      component.getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.runNowConfirmLabel,
      }),
    ).toBeInTheDocument();
  });

  test('on the Schedule tab it asks to replace the scheduled run', () => {
    renderConfirm({ mode: 'schedule' });

    expect(component.getByRole('alertdialog')).toHaveAccessibleName(
      PLAN_SCHEDULE_CONFIRM_COPY.replaceTitle(
        formatPlanScheduledFor(SCHEDULED_AT),
      ),
    );
    expect(
      component.getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.replaceConfirmLabel,
      }),
    ).toBeInTheDocument();
  });

  test('falls back to time-free wording when the fire time is unknown', () => {
    renderConfirm({ scheduledFor: null });

    expect(component.getByRole('alertdialog')).toHaveAccessibleName(
      PLAN_SCHEDULE_CONFIRM_COPY.runNowTitle(null),
    );
  });

  test('confirming reports it', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.runNowConfirmLabel,
      }),
    );

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });
});
