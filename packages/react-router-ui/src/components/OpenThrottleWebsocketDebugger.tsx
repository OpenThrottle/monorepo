import * as React from 'react';
import classnames from 'classnames';

export interface OpenThrottleWebsocketDebuggerProps {
  readonly className?: string;
}

export const OpenThrottleWebsocketDebugger = (
  props: OpenThrottleWebsocketDebuggerProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const [_bool, _setBool] = React.useState(false);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="OpenThrottleWebsocketDebugger"
    >
      <h2>OpenThrottleWebsocketDebugger</h2>
    </div>
  );
};
