import {
  DropdownMenu,
  DropdownMenuContent,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

import type { PlanToolbarScheduleMenuItemProps } from '../PlanToolbarScheduleMenuItem';
import { PlanToolbarScheduleMenuItem } from '../PlanToolbarScheduleMenuItem';

describe('PlanToolbarScheduleMenuItem Component', () => {
  let component: RenderResult;
  let props: PlanToolbarScheduleMenuItemProps;

  const renderItem = (
    overrides: Partial<PlanToolbarScheduleMenuItemProps> = {},
  ): void => {
    component?.unmount();
    props = { ...props, ...overrides };

    const Component = (): React.ReactElement => {
      return (
        <TooltipProvider>
          <DropdownMenu open={true}>
            <DropdownMenuContent>
              <PlanToolbarScheduleMenuItem {...props} />
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      disabledReason: null,
      isRescheduling: false,
      onSelect: vi.fn(),
    };

    renderItem();
  });

  test('offers Schedule… and reports a selection when the plan can be scheduled', async () => {
    const user = userEvent.setup();
    const item = await component.findByRole('menuitem', {
      name: PLAN_TOOLBAR_COPY.scheduleLabel,
    });

    expect(item).not.toHaveAttribute('aria-disabled', 'true');
    await user.click(item);

    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  test('reads Reschedule… when the plan already has a scheduled run', async () => {
    renderItem({ isRescheduling: true });

    expect(
      await component.findByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.rescheduleLabel,
      }),
    ).toBeInTheDocument();
  });

  test('disables the item, and does not select, when a reason is given', async () => {
    const user = userEvent.setup();
    renderItem({ disabledReason: PLAN_TOOLBAR_COPY.scheduleBlockedTooltip });

    const item = await component.findByRole('menuitem', {
      name: PLAN_TOOLBAR_COPY.scheduleLabel,
    });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    await user.click(item);

    expect(props.onSelect).not.toHaveBeenCalled();
  });

  test('shows the reason in a tooltip when the disabled item is hovered', async () => {
    const user = userEvent.setup();
    renderItem({ disabledReason: PLAN_TOOLBAR_COPY.scheduleActiveTooltip });

    await user.hover(
      await component.findByTestId('PlanToolbarScheduleMenuItem'),
    );

    expect(
      (await component.findAllByText(PLAN_TOOLBAR_COPY.scheduleActiveTooltip))
        .length,
    ).toBeGreaterThan(0);
  });
});
