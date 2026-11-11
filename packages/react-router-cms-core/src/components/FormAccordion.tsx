import { Accordion, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

/**
 * @public
 */
export interface FormAccordionProps {
  /** {@link FormAccordionPane}s, one per property. */
  readonly children: React.ReactNode;
  readonly className: string | undefined;
  /** The label of the pane open at first, or `undefined` for all closed. */
  readonly defaultOpen: string | undefined;
}

/**
 * @description The collapsible list of a fragment form's properties; one pane is open at a time.
 * @public
 */
export const FormAccordion = (
  props: FormAccordionProps,
): React.ReactElement => {
  const { children, className, defaultOpen } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Accordion
      className={cn(className)}
      collapsible={true}
      defaultValue={defaultOpen}
      type="single"
    >
      {children}
    </Accordion>
  );
};
