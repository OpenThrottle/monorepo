import { cn, Input } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { FORM_FIELD_COPY } from '../data/data.copy';
import { useFormField } from '../hooks/useFormField';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import { toInputValue } from '../utils/form-value';
import {
  findUnsupportedClasses,
  getSafelistedClasses,
} from '../utils/safelist';
import { FormLabel } from './FormLabel';

/**
 * @public
 */
export interface FormClassNameProps extends CmsFormBaseProps {}

/**
 * @public
 * @description The `className` widget. Classes typed here are CMS data that Tailwind never
 * scans, so any class outside the generated safelists is listed under the input as a warning
 * rather than silently doing nothing. It warns instead of blocking because checked-in code may
 * still happen to generate the class.
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
  const safelisted = React.useMemo(() => {
    return getSafelistedClasses();
  }, []);

  // Setup
  const inputValue = toInputValue(value);
  const unsupported = findUnsupportedClasses(inputValue, safelisted);
  const warningId = `${name}-unsupported`;
  const hasUnsupported = unsupported.length > 0;

  // Handlers
  const onChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
  };

  // Markup
  const warning = (
    <p
      className="text-destructive text-sm"
      data-testid="form-class-name-unsupported"
      id={warningId}
      role="status"
    >
      {FORM_FIELD_COPY.classNameUnsupported}{' '}
      <span className="font-mono">{unsupported.join(' ')}</span>
    </p>
  );

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
        aria-describedby={hasUnsupported ? warningId : undefined}
        aria-label={name}
        className="font-mono"
        disabled={disabled}
        id={name}
        name={name}
        onChange={onChange}
        required={isRequired}
        type="text"
        value={inputValue}
      />
      {hasUnsupported && warning}
    </div>
  );
};
