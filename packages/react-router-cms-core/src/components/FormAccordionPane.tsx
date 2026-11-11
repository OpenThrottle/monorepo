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
  const { children, className, label, required } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const mark = (
    <span className="text-primary">{FORM_FIELD_COPY.requiredMark}</span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AccordionItem className={cn(className)} value={label}>
      <AccordionTrigger className="px-4 font-bold">
        <span>
          {label}
          {required && mark}
        </span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
};
