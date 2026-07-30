import * as React from 'react';

/**
 * @public
 * @description Values commonly produced by form/API error state that should not
 * render (null, undefined, false, empty string).
 */
export type InlineErrorEntry = string | null | undefined | false | '';

/**
 * @public
 * @description Props for {@link InlineErrors}.
 */
export interface InlineErrorsProps {
  /**
   * @description Error messages to show. Falsy and empty-string entries are
   * filtered out before render.
   */
  readonly errors: readonly InlineErrorEntry[];
  /**
   * @description Optional heading shown above the list when at least one error
   * remains after filtering.
   */
  readonly heading?: string;
}

const ERROR_CLASS_NAME = 'text-destructive mb-2 text-center text-sm';

/**
 * @public
 * @description Renders a list of inline destructive error messages. Returns
 * `null` when every entry is falsy or empty.
 */
export const InlineErrors = (
  props: InlineErrorsProps,
): React.ReactElement | null => {
  const { errors, heading } = props;

  // Hooks

  // Setup
  const messages = errors.filter(
    (error): error is string => typeof error === 'string' && error.length > 0,
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (messages.length === 0) {
    return null;
  }

  return (
    <div data-slot="inline-errors">
      {heading ? (
        <p className="mb-2 text-center text-sm font-medium">{heading}</p>
      ) : null}
      {messages.map((message, index) => (
        <p className={ERROR_CLASS_NAME} key={`${index}-${message}`}>
          {message}
        </p>
      ))}
    </div>
  );
};
