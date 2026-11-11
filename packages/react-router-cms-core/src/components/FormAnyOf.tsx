import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { FORM_FIELD_COPY } from '../data/data.copy';
import { useFormField } from '../hooks/useFormField';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import { getAnyOfOptionLabels } from '../utils/form-value';
import { FormLabel } from './FormLabel';

/**
 * @public
 */
export interface FormAnyOfProps extends CmsFormBaseProps {}

/**
 * @description A property that may take one of several shapes. Upstream stopped at describing the
 * toggle it wanted; this lists the options so an editor can see why the field is not editable yet.
 * @public
 */
export const FormAnyOf = (props: FormAnyOfProps): React.ReactElement => {
  const { className, hideLabel, name, schema } = props;

  // Hooks
  const { description, isRequired, property } = useFormField({ name, schema });

  // Setup
  const options = getAnyOfOptionLabels(property?.anyOf);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-2 p-4', className)}>
      <FormLabel
        className={undefined}
        hideLabel={hideLabel}
        required={isRequired}
        text={name}
      />
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <p className="text-sm">{FORM_FIELD_COPY.anyOfUnsupported}</p>
      <ul className="list-inside list-disc text-sm">
        {options.map((option) => {
          return <li key={option}>{option}</li>;
        })}
      </ul>
    </div>
  );
};
