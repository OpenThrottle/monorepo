import * as React from 'react';
import classnames from 'classnames';

/**
 * @description Shell for the developer-app plan create flow once it matches the MCP `create_plan` contract (payload defaults, author/assignee rules).
 * TODO(Plan-Id:2d0865da-9cf6-4f1a-a020-b80dc056d887, Task-Id:51ac27c2-6004-4a9b-9de0-1b6a87720163): Compose with {@link PlanForm} and route action in `plans.create`; replace placeholder markup.
 */
export interface PlanCreateMcpParityShellProps {
  readonly children?: React.ReactNode;
  readonly className?: string;
}

export const PlanCreateMcpParityShell = (
  props: PlanCreateMcpParityShellProps,
) => {
  const { children, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="PlanCreateMcpParityShell"
    >
      {children ?? (
        <h2 className="text-muted-foreground text-sm">
          Plan create (MCP parity shell — not wired)
        </h2>
      )}
    </div>
  );
};
