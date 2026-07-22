import * as React from 'react';
import clsx from 'clsx';

export interface OpenThrottleToolbarProps {
  /**
   * @description Right-aligned actions dropdown, rendered after the `flex-1`
   * spacer (e.g. the "Actions" menu on both plan and task toolbars).
   */
  actionsMenu?: React.ReactNode;
  className?: string;
  /**
   * @description `data-testid` for the toolbar root so composing toolbars keep
   * their own stable test hooks (e.g. `PlanToolbar`, `PlanTaskToolbar`).
   */
  dataTestId?: string;
  /**
   * @description Primary controls rendered in the left status group alongside
   * {@link statusAction} (e.g. Run/Queue, Evaluate rules, Kill run, Promote).
   */
  primaryActions?: React.ReactNode;
  /**
   * @description Left-most status control, rendered first in the status group
   * (e.g. Mark Complete).
   */
  statusAction?: React.ReactNode;
  /**
   * @description Full-width content rendered below the action row (e.g. the
   * tag chips section).
   */
  tags?: React.ReactNode;
  /**
   * @description Optional content between the `flex-1` spacer and the
   * {@link actionsMenu} (e.g. the plan CLI-preview link).
   */
  utilityContent?: React.ReactNode;
}

/**
 * @description Shared skeleton for plan/task toolbars so they cannot drift: a
 * left status group ({@link statusAction} + {@link primaryActions}), a `flex-1`
 * spacer, optional {@link utilityContent}, a right {@link actionsMenu}, and a
 * full-width {@link tags} row below. Composers supply the slot content and their
 * own {@link dataTestId}; this component owns only the layout contract.
 */
export const OpenThrottleToolbar = (
  props: OpenThrottleToolbarProps,
): React.ReactElement => {
  const {
    actionsMenu,
    className,
    dataTestId = 'OpenThrottleToolbar',
    primaryActions,
    statusAction,
    tags,
    utilityContent,
  } = props;

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col gap-3', className)}
      data-testid={dataTestId}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {statusAction}
          {primaryActions}
        </div>

        <div className="flex-1" />

        {utilityContent}

        {actionsMenu}
      </div>

      {tags}
    </div>
  );
};
