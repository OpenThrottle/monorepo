import * as React from 'react';
import classnames from 'classnames';

export interface PersonasToolbarProps {
  className?: string;
}

export const PersonasToolbar = (
  props: PersonasToolbarProps,
): React.ReactElement => {
  const { className } = props;

  return (
    <div
      className={classnames('text-sm text-muted-foreground', className)}
      data-testid="PersonasToolbar"
    >
      Personas are read from <code>.agents/personas/</code> on disk. Edit files
      in git — no in-app writes in phase 1.
    </div>
  );
};
