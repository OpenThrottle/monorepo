import * as React from 'react';
import classnames from 'classnames';

export interface GlobalThemeProps {
  readonly className?: string;
}

export const GlobalTheme = (props: GlobalThemeProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="GlobalTheme">
      <h2>GlobalTheme</h2>

      {/* Add a button to override system vs. light/dark */}
    </div>
  );
};
