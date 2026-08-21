import * as React from 'react';
import type { PlanFormField } from '~/routing/plans/data/plan-form-action-data';

export interface PlanFormFieldErrorProps {
  /** Field this message is anchored to; omit for a form-level message. */
  field?: PlanFormField;
  message: string;
}

/**
 * @description Renders a plan-form validation message. A failed submit must
 * always leave something visible on screen, so this is used both anchored to a
 * field and as the form-level fallback for errors we cannot attribute.
 */
export const PlanFormFieldError = (
  props: PlanFormFieldErrorProps,
): React.ReactElement => {
  const { field, message } = props;

  // Hooks

  // Setup
  const className =
    field == null
      ? 'text-destructive text-sm'
      : 'text-destructive mt-1 text-sm';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <p
      className={className}
      data-testid={field == null ? 'PlanFormError' : `PlanFormError-${field}`}
      id={field == null ? undefined : `plan-${field}-error`}
      role="alert"
    >
      {message}
    </p>
  );
};
