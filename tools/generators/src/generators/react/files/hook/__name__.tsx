import * as React from 'react';

export interface <%= namePascal %>Options {}

/**
 * TODO: Add a description or delete the comment, dealers choice.
 */
export const <%= name %> = (_options: <%= namePascal %>Options) => {
  // const {} = _options;

  // Hooks
  const [value, setValue] = React.useState<string>();

  // Setup

  // Handlers
  const onCopy = (value: string) => {
    // in case we want to grab its value later
    setValue(value);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { onCopy, value };
};
