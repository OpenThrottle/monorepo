import { cn, Label } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { FORM_FIELD_COPY } from '../data/data.copy';

/**
 * @public
 */
export interface FormLabelProps {
  readonly className: string | undefined;
  /** A top-level field is already labelled by its accordion pane, so it renders no label. */
  readonly hideLabel: boolean;
  readonly required: boolean;
  /** The label text, which is also the `id` of the input it labels. */
  readonly text: string;
}

/**
 * @public
 */
export const FormLabel = (props: FormLabelProps): React.ReactElement | null => {
  const { className, hideLabel, required, text } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const mark = (
    <span className="text-primary">{FORM_FIELD_COPY.requiredMark}</span>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (hideLabel) return null;

  return (
    <Label
      className={cn('text-foreground font-medium', className)}
      htmlFor={text}
    >
      {text}
      {required && mark}
    </Label>
  );
};
