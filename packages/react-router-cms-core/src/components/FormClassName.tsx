import { cn, Input } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useFormField } from '../hooks/useFormField';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import { toInputValue } from '../utils/form-value';
import { FormLabel } from './FormLabel';

/**
 * @public
 */
export interface FormClassNameProps extends CmsFormBaseProps {}

/**
 * @public
 */
export const FormClassName = (
  props: FormClassNameProps,
): React.ReactElement => {
  const { className, disabled, hideLabel, name, schema } = props;

  // Hooks
  const { description, isRequired, setValue, value } = useFormField({
    name,
    schema,
  });

  // Setup

  // Handlers
  const onChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
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
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <Input
        aria-label={name}
        className="font-mono"
        disabled={disabled}
        id={name}
        name={name}
        onChange={onChange}
        required={isRequired}
        type="text"
        value={toInputValue(value)}
      />
    </div>
  );
};
