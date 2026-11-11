import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { FORM_FIELD_COPY } from '../data/data.copy';
import { useFormField } from '../hooks/useFormField';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import { toEnumOptions, toInputValue } from '../utils/form-value';
import { FormLabel } from './FormLabel';

/**
 * @public
 */
export interface FormSelectProps extends CmsFormBaseProps {}

/**
 * @description A property whose schema lists its allowed values in `enum`.
 * @public
 */
export const FormSelect = (props: FormSelectProps): React.ReactElement => {
  const { className, disabled, hideLabel, name, schema } = props;

  // Hooks
  const { description, isRequired, property, setValue, value } = useFormField({
    name,
    schema,
  });

  // Setup
  const options = toEnumOptions(property?.enum);

  // Handlers
  const onValueChange = (next: string): void => {
    setValue(next);
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
      <Select
        disabled={disabled}
        name={name}
        onValueChange={onValueChange}
        required={isRequired}
        value={toInputValue(value)}
      >
        <SelectTrigger aria-label={name} id={name}>
          <SelectValue placeholder={FORM_FIELD_COPY.selectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            return (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
