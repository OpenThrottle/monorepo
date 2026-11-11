import { cn, Label, Switch } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useFormField } from '../hooks/useFormField';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import { FormLabel } from './FormLabel';

/**
 * @public
 */
export interface FormBooleanProps extends CmsFormBaseProps {}

/**
 * @public
 */
export const FormBoolean = (props: FormBooleanProps): React.ReactElement => {
  const { className, disabled, hideLabel, name, schema } = props;

  // Hooks
  const { description, isRequired, setValue, value } = useFormField({
    name,
    schema,
  });

  // Setup

  // Handlers
  const onCheckedChange = (checked: boolean): void => {
    setValue(checked);
  };

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
      <div className="flex items-center gap-2">
        <Switch
          aria-label={name}
          checked={value === true}
          disabled={disabled}
          id={name}
          name={name}
          onCheckedChange={onCheckedChange}
          required={isRequired}
        />
        {description && <Label htmlFor={name}>{description}</Label>}
      </div>
    </div>
  );
};
