import { Input } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface PlanRunDialogHiddenFieldsProps {
  /** @description The action's form fields by name; blanks are already left out. */
  readonly fields: Readonly<Record<string, string>>;
}

/**
 * @description The {@link PlanRunDialog}'s hidden form fields, one read-only `<input type="hidden">`
 * per entry, so the plan detail action reads them the way it reads the toolbar's one-click form.
 */
export const PlanRunDialogHiddenFields = (
  props: PlanRunDialogHiddenFieldsProps,
): React.ReactElement => {
  const { fields } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <Input
          data-testid={`PlanRunDialog-field-${name}`}
          key={name}
          name={name}
          readOnly={true}
          type="hidden"
          value={value}
        />
      ))}
    </>
  );
};
