import * as React from 'react';
import clsx from 'clsx';

/**
 * @description Layout wrapper for the plan upload-decompose route, aligned with the MCP `create_plan` contract (server-side defaults and embeddings). It outlived the plan create form, which was removed in favour of authoring plans through the MCP.
 */
export interface PlanCreateMcpParityShellProps {
  children?: React.ReactNode;
  className?: string;
}

export const PlanCreateMcpParityShell = (
  props: PlanCreateMcpParityShellProps,
): React.ReactElement => {
  const { children, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('p-4', className)}
      data-testid="PlanCreateMcpParityShell"
    >
      {children ?? null}
    </div>
  );
};
