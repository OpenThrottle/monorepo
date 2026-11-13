import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { FORM_FIELD_COPY } from '../data/data.copy';

/**
 * @public
 */
export interface FormAccordionPaneProps {
  /** The field the pane holds. */
  readonly children: React.ReactNode;
  readonly className: string | undefined;
  /** Validation messages for this property; the pane flags them in its heading. */
  readonly errors: readonly string[];
  /** The property name — the pane's heading and its accordion value. */
  readonly label: string;
  readonly required: boolean;
}

/**
 * @description One collapsible section of a {@link FormAccordion}, labelled with its property.
 * @public
 */
export const FormAccordionPane = (
  props: FormAccordionPaneProps,
): React.ReactElement => {
  const { children, className, errors, label, required } = props;

  // Hooks

  // Setup
  const hasErrors = errors.length > 0;

  // Handlers

  // Markup
  const mark = (
    <span className="text-primary">{FORM_FIELD_COPY.requiredMark}</span>
  );
  const messages = hasErrors && (
    <ul className="text-destructive mx-4 mb-2 list-disc pl-4 text-sm">
      {errors.map((error) => {
        return <li key={error}>{error}</li>;
      })}
    </ul>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AccordionItem className={cn(className)} value={label}>
      <AccordionTrigger
        aria-invalid={hasErrors}
        className={cn('px-4 font-bold', hasErrors && 'text-destructive')}
      >
        <span>
          {label}
          {required && mark}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {messages}
        {children}
      </AccordionContent>
    </AccordionItem>
  );
};
