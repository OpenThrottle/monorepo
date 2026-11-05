import { cn, Input, Label, TextArea } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { BlogPostTextFieldName } from '~/routing/blog/types';

export interface BlogPostTextFieldProps {
  readonly className?: string;
  readonly error: string | undefined;
  readonly field: BlogPostTextFieldName;
  readonly hint?: string;
  readonly inputClassName?: string;
  readonly label: string;
  readonly multiline?: boolean;
  readonly onChange: (field: BlogPostTextFieldName, value: string) => void;
  readonly placeholder?: string;
  /** Static text rendered before the input, e.g. `/blog/` before a slug. */
  readonly prefix?: string;
  readonly value: string;
}

/**
 * @description One labelled text input (or textarea) of the post editor, with
 * an optional hint and an inline error wired up through `aria-describedby`.
 */
export const BlogPostTextField = (
  props: BlogPostTextFieldProps,
): React.ReactElement => {
  const {
    className,
    error,
    field,
    hint,
    inputClassName,
    label,
    multiline = false,
    onChange,
    placeholder,
    prefix,
    value,
  } = props;

  // Hooks

  // Setup
  const id = `blog-post-${field}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined;
  const showHint = hint && !error;
  const shared = {
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    id,
    name: field,
    placeholder,
    value,
  };

  // Handlers
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    onChange(field, event.target.value);
  };

  // Markup
  const prefixLabel = (
    <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-2 font-mono text-xs">
      {prefix}
    </span>
  );
  const textArea = (
    <TextArea
      {...shared}
      className={cn('min-h-[72px] resize-y', inputClassName)}
      onChange={handleChange}
      rows={2}
    />
  );
  const input = (
    <div className="flex items-center">
      {prefix ? prefixLabel : null}
      <Input
        {...shared}
        className={cn(prefix && 'rounded-l-none', inputClassName)}
        onChange={handleChange}
      />
    </div>
  );
  const hintText = (
    <p className="text-muted-foreground text-xs" id={hintId}>
      {hint}
    </p>
  );
  const errorMessage = (
    <p className="text-destructive text-xs" id={errorId} role="alert">
      {error}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-1.5', className)}
      data-testid="BlogPostTextField"
    >
      <Label htmlFor={id}>{label}</Label>
      {multiline ? textArea : input}
      {showHint ? hintText : null}
      {error ? errorMessage : null}
    </div>
  );
};
