import { cn, TextArea } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { FORM_FIELD_COPY } from '../data/data.copy';
import { useFormField } from '../hooks/useFormField';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import { FormLabel } from './FormLabel';

/**
 * @public
 */
export interface FormObjectProps extends CmsFormBaseProps {}

/**
 * @description An object property, edited as JSON. Only text that parses is written to the draft;
 * upstream stored the raw string.
 * @public
 */
export const FormObject = (props: FormObjectProps): React.ReactElement => {
  const { className, disabled, hideLabel, name, schema } = props;

  // Hooks
  const { description, isRequired, setValue, value } = useFormField({
    name,
    schema,
  });
  const [text, setText] = React.useState(() => {
    return value === undefined ? '' : JSON.stringify(value, null, 2);
  });
  const [isInvalid, setIsInvalid] = React.useState(false);

  // Setup

  // Handlers
  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const next = event.target.value;

    setText(next);

    try {
      setValue(JSON.parse(next));
      setIsInvalid(false);
    } catch {
      setIsInvalid(true);
    }
  };

  // Markup
  const invalid = (
    <p className="text-destructive text-sm" role="alert">
      {FORM_FIELD_COPY.objectInvalid}
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
      <TextArea
        aria-invalid={isInvalid}
        aria-label={name}
        className="font-mono"
        disabled={disabled}
        id={name}
        onChange={onChange}
        required={isRequired}
        value={text}
      />
      {isInvalid && invalid}
    </div>
  );
};
