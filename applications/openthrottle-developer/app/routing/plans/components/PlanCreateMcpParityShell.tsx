import * as React from 'react';
import classnames from 'classnames';

/**
 * @description Layout wrapper for the developer-app plan create flow aligned with the MCP `create_plan` contract (server-side defaults and embeddings).
 */
export interface PlanCreateMcpParityShellProps {
  readonly children?: React.ReactNode;
  readonly className?: string;
}

export const PlanCreateMcpParityShell = (
  props: PlanCreateMcpParityShellProps,
): React.ReactElement => {
  const { children, className } = props;

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="PlanCreateMcpParityShell"
    >
      {children ?? null}
    </div>
  );
};
