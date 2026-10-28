import * as React from 'react';

export interface <%= namePascal %>Options {}

export interface <%= namePascal %>Result {
  readonly onCopy: (value: string) => void;
  readonly value: string | undefined;
}

/**
 * TODO: Add a description or delete the comment, dealers choice.
 */
export const <%= name %> = (
  _options: <%= namePascal %>Options,
): <%= namePascal %>Result => {
  // const {} = _options;

  // Hooks
  const [value, setValue] = React.useState<string>();

  // Setup

  // Handlers
  const onCopy = (value: string): void => {
    // in case we want to grab its value later
    setValue(value);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { onCopy, value };
};
