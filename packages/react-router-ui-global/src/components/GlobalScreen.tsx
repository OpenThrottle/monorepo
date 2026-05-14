import * as React from 'react';
// import classnames from 'classnames';

export interface GlobalScreenProps extends React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement>
> {
  readonly className?: string;
}

export const GlobalScreen = (props: GlobalScreenProps): React.ReactElement => {
  const {
    children,
    className = 'flex flex-col p-4 md:p-8 lg:p-12 gap-4 md:gap-8 lg:gap-12 max-w-6xl w-full',
    ...rest
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
};
