import { cn, Label } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { FORM_FIELD_COPY } from '../data/data.copy';

/**
 * @public
 */
export interface FormLabelProps {
  readonly className: string | undefined;
  /** The label text, which is also the `id` of the input it labels. */
  readonly copy: string;
  /** A top-level field is already labelled by its accordion pane, so it renders no label. */
  readonly parent: boolean;
  readonly required: boolean;
}

/**
 * @public
 */
export const FormLabel = (props: FormLabelProps): React.ReactElement | null => {
  const { className, copy, parent, required } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const mark = (
    <span className="text-primary">{FORM_FIELD_COPY.requiredMark}</span>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (parent) return null;

  return (
    <Label
      className={cn('text-foreground font-medium', className)}
      htmlFor={copy}
    >
      {copy}
      {required && mark}
    </Label>
  );
};
